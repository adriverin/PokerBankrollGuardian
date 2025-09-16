import matplotlib
matplotlib.use('Agg')  # non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import statistics as stat
import os, time
from flask import Flask, render_template, request

# ---------- Loss / drawdown metrics ----------
def var_cvar_losses_from_pnl(total_pnl_series: pd.Series, alpha=5):
    q = np.percentile(total_pnl_series, alpha)
    var_loss = -q
    cvar_loss = -total_pnl_series[total_pnl_series <= q].mean()
    return float(var_loss), float(cvar_loss)

def max_drawdown_per_path(bankroll_paths: np.ndarray) -> np.ndarray:
    running_max = np.maximum.accumulate(bankroll_paths, axis=1)
    drawdowns = running_max - bankroll_paths  # >=0
    return drawdowns.max(axis=1)

# ---------- Core simulation helpers ----------
def simulate_paths_from_samples(
    session_samples: np.ndarray,  # per-session PnL in currency at the **target stake**
    n_sessions: int,
    n_paths: int,
    start_bankroll: float
) -> np.ndarray:
    """
    Bootstrap simulation. Returns matrix shape (n_paths, n_sessions) of bankroll levels.
    """
    rng = np.random.default_rng()
    draws = rng.choice(session_samples, size=(n_paths, n_sessions), replace=True)
    bankroll_paths = start_bankroll + np.cumsum(draws, axis=1)
    return bankroll_paths

def risk_of_ruin(bankroll_paths: np.ndarray) -> float:
    """
    Probability that bankroll dips below zero at any point along a path.
    """
    return float(np.mean(bankroll_paths.min(axis=1) < 0))

def summarize_paths(bankroll_paths: np.ndarray, start_bankroll: float, alpha: int, n_sessions: int, n_paths: int):
    pnl = pd.Series(bankroll_paths[:, -1] - start_bankroll)
    mean_pnl   = float(pnl.mean())
    median_pnl = float(pnl.median())
    p05_pnl    = float(np.percentile(pnl, 5))
    p95_pnl    = float(np.percentile(pnl, 95))
    var_loss, cvar_loss = var_cvar_losses_from_pnl(pnl, alpha=alpha)
    ror = risk_of_ruin(bankroll_paths)
    mdd = max_drawdown_per_path(bankroll_paths)
    mean_mdd = float(np.mean(mdd))
    p50_mdd  = float(np.percentile(mdd, 50))
    p95_mdd  = float(np.percentile(mdd, 95))
    return {
        "Simulated Sessions": n_sessions,
        "Monte Carlo Paths": n_paths,
        "Mean Total PnL": round(mean_pnl, 2),
        "Median Total PnL": round(median_pnl, 2),
        "p05 Total PnL": round(p05_pnl, 2),
        "p95 Total PnL": round(p95_pnl, 2),
        f"VaR (loss) at {alpha}%": round(var_loss, 2),
        f"CVaR (loss) in worst {alpha}%": round(cvar_loss, 2),
        "Risk of Ruin": f"{100*ror:.2f}%",
        "Mean Max Drawdown": round(mean_mdd, 2),
        "p50 Max Drawdown": round(p50_mdd, 2),
        "p95 Max Drawdown": round(p95_mdd, 2),
    }

# ---------- Bankroll Guardian: stake search ----------
def recommend_stake_bb_value(
    hist_sessions_currency: np.ndarray,
    current_bb_value: float,     # currency per 1bb at which history was played (e.g. $1 for NL100)
    start_bankroll: float,
    target_ror: float,           # e.g. 0.01 for 1%
    n_sessions: int,
    n_paths: int,
    bb_min: float,
    bb_max: float,
    tol: float = 0.05
):
    """
    Binary search the **bb value** (stake) that keeps risk-of-ruin <= target over n_sessions.
    Assumes per-session results scale ~linearly with bb value.
    """
    def ror_at(bb_value: float) -> float:
        scale = bb_value / current_bb_value
        samples = hist_sessions_currency * scale
        paths = simulate_paths_from_samples(samples, n_sessions, n_paths, start_bankroll)
        return risk_of_ruin(paths)

    lo, hi = bb_min, bb_max
    if ror_at(lo) > target_ror:
        return lo, ror_at(lo)
    if ror_at(hi) <= target_ror:
        return hi, ror_at(hi)

    while (hi - lo) > tol:
        mid = (lo + hi) / 2.0
        r = ror_at(mid)
        if r <= target_ror:
            lo = mid
        else:
            hi = mid
    r_final = ror_at(lo)
    return lo, r_final

# ---------- Scenario Lab helpers ----------
def adjust_samples_for_scenario(
    hist_sessions_currency: np.ndarray,
    current_bb_value: float,
    scenario_bb_value: float,
    winrate_delta_bb100: float,     # change in bb/100 at the scenario stake
    avg_hands_per_session: float,   # to translate bb/100 -> per-session currency
    vol_multiplier: float
) -> np.ndarray:
    """
    Build scenario-adjusted per-session samples (currency) from history:
    1) Scale stake: multiply by scenario_bb/current_bb
    2) Apply volatility multiplier about the mean (so mean is preserved before step 3)
    3) Add mean shift equal to winrate_delta_bb100 * (hands/100) * scenario_bb
    """
    # 1) stake scaling
    scale_stake = scenario_bb_value / current_bb_value
    scaled = hist_sessions_currency * scale_stake

    # 2) volatility around the mean
    mu = scaled.mean()
    centered = scaled - mu
    vol_adj = centered * vol_multiplier + mu

    # 3) mean shift from winrate delta (bb/100 -> currency per session)
    delta_mu_currency = winrate_delta_bb100 * (avg_hands_per_session / 100.0) * scenario_bb_value
    adjusted = vol_adj + delta_mu_currency
    return adjusted

# ---------- Alerts helpers ----------
def weekly_drawdown_from_list(last_sessions: np.ndarray) -> float:
    """
    Compute max drawdown over a short window starting at 0 using a list of session PnLs.
    Returns a positive magnitude (currency).
    """
    if last_sessions.size == 0:
        return 0.0
    cum = np.cumsum(last_sessions)
    run_max = np.maximum.accumulate(np.concatenate(([0.0], cum)))
    run_max = run_max[1:]
    dd = run_max - cum
    return float(dd.max())

# ---------- Pre-filled session list (your data) ----------
DEFAULT_SESSION_TEXT = """1530.00, 2165.00, 255.00, -500.00, -500.00, 450.00, 825.00, -250.00, 1105.00, 95.00, 255.00, 1235.00, 795.00, 390.00, 845.00, 125.00, 435.00, 1265.00, 490.00, -500.00, -55.00, 840.00, -500.00, 295.00, 300.00, -200.00, 1195.00, -500.00, -195.00, -500.00, -500.00, -500.00, -315.00, 725.00, 400.00, -500.00, 1125.00, -345.00, 125.00, 800.00, -900.00, 1260.00, 970.00, -1000.00, -1000.00, 155.00, 155.00, -310.00, 1145.00, 1090.00, 1105.00, 715.00, 840.00, 715.00, -35.00, -490.00, -730.00, 450.00, 400.00, 256.00, 1530.00, 1895.00, 63.00, 690.00, -1000.00, 30.00, -215.00, -890.00, -600.00, 1950.00, 835.00, -210.00, 85.00, -20.00, 845.00, 1810.00, -1100.00, 2485.00, 2345.00, 580.00, -1030.00, 3215.00, 910.00, 730.00, 45.00, 380.00, -645.00, -1365.00, -1100.00, 115.00, 3240.00, -1130.00, 415.00, -1365.00, -190.00, -1160.00, -1940.00, -1900.00, -105.00, -650.00, -635.00, -25.00, 900.00, 580.00, -1000.00, 1080.00, 1295.00, -300.00, -200.00, -1635.00, -1300.00, 155.00, 600.00, -1320.00, -1000.00, -1000.00, 250.00, -390.00, -1030.00, -830.00, 300.00, -1300.00, 1595.00, 2465.00, 1530.00, 280.00, -1000.00, -525.00, 1035.00, 930.00, 865.00, 800.00, 690.00, -1690.00, 350.00, 755.00, 1300.00, 1365.00, -2000.00, -210.00, -800.00, -75.00, 220.00, -925.00, -310.00, 2500.00, 405.00, -40.00, 410.00, -200.00, 525.00, -1000.00, -680.00, -975.00, 285.00, 730.00, 1020.00, 770.00, 1510.00, 1065.00, 90.00, -450.00, -650.00, 2370.00, 1375.00, -230.00, -1000.00, -150.00, -1500.00, -25.00, 200.00, 55.00, -585.00, 230.00, -560.00, 1960.00, -120.00, -2000.00, 1205.00, 340.00, -120.00, 620.00, -305.00, 1270.00, 150.00"""

# ---------- Flask ----------
app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    cb = str(int(time.time()))
    if request.method == 'POST':
        try:
            os.makedirs('static', exist_ok=True)

            form_id = request.form.get('form_id', 'sim')

            # Parse shared session list
            session_text = request.form.get('session_results', DEFAULT_SESSION_TEXT)
            session_vals = [float(x.strip())
                            for x in session_text.replace(' ', ',').split(',')
                            if x.strip()]
            if not session_vals:
                raise ValueError("Please provide at least one session result.")
            session_series = pd.Series(session_vals)

            # Historical stats + plot
            mean = session_series.mean()
            std_dev = session_series.std(ddof=1)
            median = session_series.median()

            plt.rcParams['figure.figsize'] = [8, 5]
            plt.figure()
            plt.plot(np.cumsum(session_series.values))
            plt.title('Historical Cumulative PnL')
            plt.xlabel('Number of Sessions')
            plt.ylabel('PnL (currency or bb)')
            plt.grid()
            plot_path_stat = 'static/plot_stats.png'
            plt.savefig(plot_path_stat, dpi=140, bbox_inches='tight')
            plt.close()

            # Defaults for template sections
            plot_path_normal = plot_path_t = plot_path_boot = None
            metrics_normal = metrics_t = metrics_boot = None
            guardian_results = None
            scenario_results = None
            plot_path_scenario = None
            alerts_results = None

            # ---------------- SIMULATOR ----------------
            if form_id == 'sim':
                num_samples   = int(request.form['num_samples'])
                start_bankroll = float(request.form['start_bankroll'])
                mc_sims       = int(request.form['mc_sims'])

                rng = np.random.default_rng()

                # Normal MC
                draws_normal = rng.normal(loc=mean, scale=std_dev, size=(mc_sims, num_samples))
                bankroll_sims_normal = start_bankroll + np.cumsum(draws_normal, axis=1)
                plt.rcParams['figure.figsize'] = [10, 6]
                plt.figure()
                plt.plot(bankroll_sims_normal.T)
                plt.axhline(y=start_bankroll, color='black', linestyle='-', linewidth=2.0)
                plt.title('Cumulative Bankroll (Normal MC)')
                plt.xlabel('Number of Sessions'); plt.ylabel('Bankroll'); plt.grid()
                plot_path_normal = 'static/plot_sims.png'
                plt.savefig(plot_path_normal, dpi=140, bbox_inches='tight'); plt.close()

                # Student-t MC
                nu = 7
                t = rng.standard_t(df=nu, size=(mc_sims, num_samples))
                if nu > 2: t = t / np.sqrt(nu/(nu-2))
                draws_t = mean + std_dev * t
                bankroll_sims_t = start_bankroll + np.cumsum(draws_t, axis=1)
                plt.figure()
                plt.plot(bankroll_sims_t.T)
                plt.axhline(y=start_bankroll, color='black', linestyle='-', linewidth=2.0)
                plt.title('Cumulative Bankroll (Student-t MC)')
                plt.xlabel('Number of Sessions'); plt.ylabel('Bankroll'); plt.grid()
                plot_path_t = 'static/plot_sims_t.png'
                plt.savefig(plot_path_t, dpi=140, bbox_inches='tight'); plt.close()

                # Bootstrap MC
                draws_boot = np.random.default_rng().choice(session_series.values, size=(mc_sims, num_samples), replace=True)
                bankroll_sims_boot = start_bankroll + np.cumsum(draws_boot, axis=1)
                plt.figure()
                plt.plot(bankroll_sims_boot.T)
                plt.axhline(y=start_bankroll, color='black', linestyle='-', linewidth=2.0)
                plt.title('Cumulative Bankroll (Bootstrap MC)')
                plt.xlabel('Number of Sessions'); plt.ylabel('Bankroll'); plt.grid()
                plot_path_boot = 'static/plot_sims_boot.png'
                plt.savefig(plot_path_boot, dpi=140, bbox_inches='tight'); plt.close()

                # Metrics
                alpha = 5
                metrics_normal = summarize_paths(bankroll_sims_normal, start_bankroll, alpha, num_samples, mc_sims)
                metrics_t      = summarize_paths(bankroll_sims_t,      start_bankroll, alpha, num_samples, mc_sims)
                metrics_boot   = summarize_paths(bankroll_sims_boot,   start_bankroll, alpha, num_samples, mc_sims)

            # ---------------- GUARDIAN ----------------
            elif form_id == 'guardian':
                start_bankroll       = float(request.form['gr_start_bankroll'])
                horizon_sessions     = int(request.form['gr_sessions'])
                mc_sims              = int(request.form['gr_paths'])
                target_ror_percent   = float(request.form['gr_target_ror'])
                current_bb_value     = float(request.form['gr_current_bb'])
                search_min_bb        = float(request.form['gr_search_min_bb'])
                search_max_bb        = float(request.form['gr_search_max_bb'])
                target_ror = target_ror_percent / 100.0

                rec_bb, rec_ror = recommend_stake_bb_value(
                    hist_sessions_currency=np.array(session_series.values, dtype=float),
                    current_bb_value=current_bb_value,
                    start_bankroll=start_bankroll,
                    target_ror=target_ror,
                    n_sessions=horizon_sessions,
                    n_paths=mc_sims,
                    bb_min=search_min_bb,
                    bb_max=search_max_bb,
                    tol=0.05
                )

                # Suggested stop-loss: 95th percentile loss of a session at recommended stake
                scale = rec_bb / current_bb_value
                session_at_rec = session_series.values * scale
                p05 = float(np.percentile(session_at_rec, 5))
                suggested_stop_loss = round(max(0.0, -p05), 2)

                # Metrics at recommended stake
                paths = simulate_paths_from_samples(session_at_rec, horizon_sessions, mc_sims, start_bankroll)
                metrics_guardian = summarize_paths(paths, start_bankroll, alpha=5, n_sessions=horizon_sessions, n_paths=mc_sims)

                guardian_results = {
                    "Target RoR": f"{target_ror_percent:.2f}%",
                    "Horizon (sessions)": horizon_sessions,
                    "Paths": mc_sims,
                    "Recommended BB value": f"{rec_bb:.2f}",
                    "Implied stake vs current": f"{(rec_bb/current_bb_value):.2f}×",
                    "Estimated RoR at rec stake": f"{100*rec_ror:.2f}%",
                    "Suggested per-session stop-loss": suggested_stop_loss,
                    # NEW: raw inputs to allow Alerts to auto-fill
                    "inputs": {
                        "start_bankroll": float(start_bankroll),
                        "horizon_sessions": int(horizon_sessions),
                        "paths": int(mc_sims),
                        "current_bb_value": float(current_bb_value),
                        "recommended_bb_value": float(rec_bb),
                    },
                    "metrics": metrics_guardian
                }

            # ---------------- SCENARIO LAB ----------------
            elif form_id == 'scenario':
                sc_start_bankroll   = float(request.form['sc_start_bankroll'])
                sc_sessions         = int(request.form['sc_sessions'])
                sc_paths            = int(request.form['sc_paths'])
                sc_current_bb       = float(request.form['sc_current_bb'])
                sc_bb_value         = float(request.form['sc_bb_value'])
                sc_winrate_bb100    = float(request.form['sc_winrate_bb100'])
                sc_avg_hands        = float(request.form['sc_avg_hands'])
                sc_vol_mult         = float(request.form['sc_vol_mult'])

                adjusted_samples = adjust_samples_for_scenario(
                    hist_sessions_currency=np.array(session_series.values, dtype=float),
                    current_bb_value=sc_current_bb,
                    scenario_bb_value=sc_bb_value,
                    winrate_delta_bb100=sc_winrate_bb100,
                    avg_hands_per_session=sc_avg_hands,
                    vol_multiplier=sc_vol_mult
                )
                scenario_paths = simulate_paths_from_samples(adjusted_samples, sc_sessions, sc_paths, sc_start_bankroll)

                plt.rcParams['figure.figsize'] = [10, 6]
                plt.figure()
                plt.plot(scenario_paths.T)
                plt.axhline(y=sc_start_bankroll, color='black', linestyle='-', linewidth=2.0)
                plt.title('Scenario Lab – Cumulative Bankroll')
                plt.xlabel('Number of Sessions'); plt.ylabel('Bankroll (currency)'); plt.grid()
                plot_path_scenario = 'static/plot_scenario.png'
                plt.savefig(plot_path_scenario, dpi=140, bbox_inches='tight'); plt.close()

                scenario_metrics = summarize_paths(scenario_paths, sc_start_bankroll, alpha=5,
                                                   n_sessions=sc_sessions, n_paths=sc_paths)
                scenario_results = {
                    "inputs": {
                        "Starting bankroll": sc_start_bankroll,
                        "Horizon (sessions)": sc_sessions,
                        "Paths": sc_paths,
                        "Current BB value": sc_current_bb,
                        "Scenario BB value": sc_bb_value,
                        "Winrate shift (bb/100)": sc_winrate_bb100,
                        "Avg hands per session": sc_avg_hands,
                        "Volatility multiplier": f"{sc_vol_mult:.2f}×",
                    },
                    "metrics": scenario_metrics
                }

            # ---------------- ALERTS & NOTIFICATIONS (BETA) ----------------
            elif form_id == 'alerts':
                # Thresholds / policy
                al_stop_loss      = float(request.form['al_stop_loss'])
                al_week_cap       = float(request.form['al_week_cap'])
                al_ror_limit_pct  = float(request.form['al_ror_limit'])
                # Live / recent figures
                al_current_pnl    = float(request.form.get('al_current_pnl', 0.0))
                al_week_pnl       = request.form.get('al_week_pnl', '')
                al_last7_list_txt = request.form.get('al_last7_list', '').strip()

                # RoR estimation inputs
                al_start_bankroll = float(request.form['al_start_bankroll'])
                al_sessions       = int(request.form['al_sessions'])
                al_paths          = int(request.form['al_paths'])
                al_current_bb     = float(request.form['al_current_bb'])
                al_bb_value       = float(request.form['al_bb_value'])

                # ----- Checks -----
                alerts = []

                # Stop-loss check
                if al_current_pnl <= -al_stop_loss:
                    alerts.append({"severity": "danger", "title": "Session Stop-Loss Hit",
                                   "msg": f"Current session PnL {al_current_pnl:.2f} ≤ -{al_stop_loss:.2f}. Recommend immediate stop."})
                else:
                    alerts.append({"severity": "success", "title": "Session OK",
                                   "msg": f"Current session PnL {al_current_pnl:.2f} above stop-loss (-{al_stop_loss:.2f})."})

                # Weekly drawdown check
                weekly_dd = 0.0
                if al_last7_list_txt:
                    last7 = [float(x.strip()) for x in al_last7_list_txt.replace(' ', ',').split(',') if x.strip()]
                    weekly_dd = weekly_drawdown_from_list(np.array(last7, dtype=float))
                else:
                    if al_week_pnl.strip() == "":
                        al_week_pnl_val = 0.0
                    else:
                        al_week_pnl_val = float(al_week_pnl)
                    weekly_dd = max(0.0, -al_week_pnl_val)

                if weekly_dd > al_week_cap:
                    alerts.append({"severity": "warning", "title": "Weekly Drawdown Breach",
                                   "msg": f"Weekly drawdown {weekly_dd:.2f} exceeds cap {al_week_cap:.2f}. Consider break or reducing stakes."})
                else:
                    alerts.append({"severity": "success", "title": "Weekly Drawdown OK",
                                   "msg": f"Weekly drawdown {weekly_dd:.2f} within cap {al_week_cap:.2f}."})

                # RoR policy check via simulation at chosen stake
                scale = al_bb_value / al_current_bb
                samples = np.array(session_series.values, dtype=float) * scale
                paths = simulate_paths_from_samples(samples, al_sessions, al_paths, al_start_bankroll)
                ror_est = risk_of_ruin(paths)
                if 100*ror_est > al_ror_limit_pct:
                    alerts.append({"severity": "danger", "title": "Risk of Ruin Above Policy",
                                   "msg": f"Estimated RoR {100*ror_est:.2f}% exceeds policy {al_ror_limit_pct:.2f}%."})
                else:
                    alerts.append({"severity": "success", "title": "Risk of Ruin OK",
                                   "msg": f"Estimated RoR {100*ror_est:.2f}% within policy {al_ror_limit_pct:.2f}%."})

                # Package results
                alerts_results = {
                    "inputs": {
                        "Stop-loss": al_stop_loss,
                        "Weekly drawdown cap": al_week_cap,
                        "RoR policy (%)": al_ror_limit_pct,
                        "Current session PnL": al_current_pnl,
                        "Week-to-date PnL (if no list)": al_week_pnl if al_week_pnl.strip() else "—",
                        "Last 7 sessions (parsed)": al_last7_list_txt if al_last7_list_txt else "—",
                        "RoR check – Start BR": al_start_bankroll,
                        "RoR check – Sessions": al_sessions,
                        "RoR check – Paths": al_paths,
                        "RoR check – Current BB": al_current_bb,
                        "RoR check – Stake BB": al_bb_value,
                    },
                    "derived": {
                        "Weekly drawdown (computed)": round(weekly_dd, 2),
                        "Estimated RoR (%)": round(100*ror_est, 2),
                    },
                    "alerts": alerts
                }

            # Historical quick stats
            table_stats = [
                {'name': 'Historical Sessions', 'value': int(len(session_series))},
                {'name': 'Average per Session', 'value': np.round(mean, 2)},
                {'name': 'Median per Session', 'value': np.round(median, 2)},
                {'name': 'Std. Dev. per Session', 'value': np.round(std_dev, 2)},
            ]

            return render_template(
                'index.html',
                # images
                plot_url_stat='static/plot_stats.png',
                plot_url=plot_path_normal,
                plot_url_t=plot_path_t,
                plot_url_boot=plot_path_boot,
                plot_url_scenario=plot_path_scenario,
                # tables
                table_stats=table_stats,
                metrics_normal=metrics_normal,
                metrics_t=metrics_t,
                metrics_boot=metrics_boot,
                guardian_results=guardian_results,
                scenario_results=scenario_results,
                alerts_results=alerts_results,
                # form values
                default_session_text=session_text,
                cb=cb
            )

        except Exception as e:
            return render_template('index.html', error=str(e), default_session_text=DEFAULT_SESSION_TEXT, cb=cb)

    # GET
    return render_template('index.html', default_session_text=DEFAULT_SESSION_TEXT, cb=cb)

if __name__ == '__main__':
    app.run(debug=True)
