import matplotlib
matplotlib.use('Agg')  # Use a non-interactive backend suitable for Flask
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import statistics as stat
import os
from flask import Flask, render_template, request


# calculate value at risk (= loss threshold in the alpha% worst cases, i.e. I lose at least x)
def mcVaR(returns, alpha=5):
    """ Input: pandas series of returns 
        Output: percentile on return distribution to a given confidence level alpha
    """
    #check if instance of pandas
    if isinstance(returns, pd.Series):
        return np.percentile(returns, alpha)
    else:
        raise TypeError("Error: expected a Pandas data series")

# calculate expected shortfall (=mean lose on the alpha% worst loses)
def mcCVaR(returns, alpha=5):
    """ Input: pandas series of returns 
        Output: CVaR or Expected Shortfall to a given confidence level alpha
    """
    #check if instance of pandas
    if isinstance(returns, pd.Series):
        belowVaR = returns <= mcVaR(returns, alpha=alpha)
        return returns[belowVaR].mean()
    else:
        raise TypeError("Error: expected a Pandas data series")


app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            # get and treat all inputs from web app

            # currently not an input on the web app; calculate from session results
            #mean = float(request.form['mean']) # mean earnings per session
            #std_dev = float(request.form['std_dev']) # standard deviation per session


            num_samples = int(request.form['num_samples']) # number of sessions to predict
            start_bankroll = float(request.form['start_bankroll']) # starting bankroll 
            mc_sims = int(request.form['mc_sims']) # number of Monte Carlo simulations requested
            session_results1 = (request.form.get('session_results'))
            #session_results = float(session_results)

  

            # transform session results info into pdSeries
            #session_results = [float(x.strip()) for x in session_results.split(',')] 
            #session_results = [x for x in session_results1] 
            session_results = [float(x.strip()) for x in session_results1.replace(' ', ',').split(',') if x.strip()]
            session_results = pd.Series(session_results)

            # compute mean and standard deviation of the input results
            mean = session_results.mean()
            std_dev = session_results.std()
            median = session_results.median()

            meanM = np.full(shape=(num_samples), fill_value = mean) #mean to save each simulation in an array of length number of sessions to simulate
            # initialise object to save the simulations
            bankroll_sims = np.full(shape=(mc_sims, num_samples), fill_value = 0.0)



            for m in range(mc_sims):
                Z = np.random.normal(loc=mean, scale= std_dev, size=(num_samples))#random
                daily_returns = meanM + Z
                bankroll_sims[m, :] = np.cumsum(daily_returns).flatten()
                bankroll_sims[m, :] += start_bankroll
                #bankroll_sims[m,:] = (np.cumsum( daily_returns) ) + start_bankroll # * start_bankroll
            
            bankroll_sims = bankroll_sims.T

            # Create a plot
            plt.rcParams['figure.figsize'] = [8, 5]
            plt.figure()
            plt.plot(np.cumsum(session_results))
            plt.title('Cumulative Earnings')
            plt.xlabel('Number of Sessions')
            plt.ylabel('Earnings ($ or bb)')
            plt.grid()
            #print(mean,std_dev,num_samples)

            # Save plot
            plot_path_stat = 'static/plot_stats.png'
            plt.savefig(plot_path_stat)
            plt.close()

            # Create a plot
            plt.rcParams['figure.figsize'] = [10, 6]
            plt.figure()
            plt.plot(bankroll_sims)
            plt.axhline(y=start_bankroll, color='black', linestyle='-', linewidth=2.0)
            plt.title('Cumulative Earnings')
            plt.xlabel('Number of Sessions')
            plt.ylabel('Earnings ($ or bb)')
            plt.grid()
            #print(mean,std_dev,num_samples)

            # Save plot
            plot_path = 'static/plot_sims.png'
            plt.savefig(plot_path)
            plt.close()


            # Prepare table data
            alpha = 5
            bankroll_sims_result = pd.Series(bankroll_sims[-1,:])
            #VaR = - start_bankroll + mcVaR(bankroll_sims_result, alpha)
            VaR =  mcVaR(bankroll_sims_result, alpha)
            #CVaR = - start_bankroll + mcCVaR(bankroll_sims_result, alpha)
            CVaR = mcCVaR(bankroll_sims_result, alpha)

            # compute mean and median results
            mean_results_sim = bankroll_sims_result.mean()
            median_results_sim = stat.median(bankroll_sims_result)


            table_stats = [
                {'name': 'Number of Sessions', 'value': len(session_results)},
                {'name': 'Average Earnings per session', 'value': np.round(mean, 2)},
                {'name': 'Median Earnings per session', 'value': np.round(median, 2)},
                {'name': 'Standard Deviation', 'value': np.round(std_dev, 2)},
            ]         

            table_data = [
                {'name': 'Number of Sessions', 'value': num_samples},
                {'name': f'Max bankroll in {alpha}% of worst simulations', 'value': np.round(VaR, 2)},
                {'name': f'Average Bankroll in {alpha}% of worst simulations', 'value': np.round(CVaR, 2)},
                {'name': 'Mean Total Bankroll', 'value': np.round(mean_results_sim+start_bankroll, 2)},
                {'name': 'Median Total Bankroll', 'value': np.round(median_results_sim+start_bankroll, 2)},
            ]            

            return render_template('index.html', plot_url_stat=plot_path_stat, table_stats=table_stats, plot_url=plot_path, table_data=table_data)
        except Exception as e:
            return render_template('index.html', error=str(e))
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
