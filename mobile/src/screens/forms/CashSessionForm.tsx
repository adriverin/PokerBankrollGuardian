import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  Pressable,
  StyleProp,
  ViewStyle
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from '@/utils/dayjs';
import { useTheme } from '@/theme';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLiveTimer } from '@/hooks/useLiveTimer';
import type { CashSession } from '@/types';
import { upsertCashSession } from '@/db/repository';
import { queueMutation } from '@/sync/mutationHelpers';
import { formatCurrency } from '@/utils/format';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  startTs: z.string(),
  endTs: z.string().optional().nullable(),
  venue: z.string().optional(),
  game: z.string().default('NLH'),
  sbCents: z.coerce.number().min(0),
  bbCents: z.coerce.number().min(0),
  buyinCents: z.coerce.number().min(0),
  cashoutCents: z.coerce.number().min(0).optional().nullable(),
  tipsCents: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  running: z.boolean().default(false)
});

export type CashSessionFormValues = z.infer<typeof schema>;

interface Props {
  session?: CashSession;
  onSaved: (session: CashSession) => void;
}

export default function CashSessionForm({ session, onSaved }: Props) {
  const theme = useTheme();
  const addCash = useSessionStore((state) => state.addCashSession);
  const updateCash = useSessionStore((state) => state.updateCashSession);
  const defaults = useSettingsStore((state) => state.lastSessionDefaults);
  const setDefaults = useSettingsStore((state) => state.updateLastSessionDefaults);
  const userId = useAuthStore((state) => state.user?.id ?? 'me');

  const form = useForm<CashSessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startTs: session?.startTs ?? dayjs().toISOString(),
      endTs: session?.endTs ?? null,
      venue: session?.venue ?? defaults?.venue ?? '',
      game: session?.game ?? defaults?.game ?? 'NLH',
      sbCents: session?.sbCents ?? defaults?.sbCents ?? 100,
      bbCents: session?.bbCents ?? defaults?.bbCents ?? 200,
      buyinCents: session?.buyinCents ?? defaults?.buyInCents ?? 20000,
      cashoutCents: session?.cashoutCents ?? null,
      tipsCents: session?.tipsCents ?? null,
      notes: session?.notes ?? '',
      tags: session?.tags?.join(', ') ?? '',
      running: !session?.endTs
    }
  });

  const running = form.watch('running');
  const startTs = form.watch('startTs');
  const elapsedSeconds = useLiveTimer(startTs, running);
  const elapsedHours = elapsedSeconds / 3600;
  const cashout = form.watch('cashoutCents') ?? 0;
  const buyin = form.watch('buyinCents') ?? 0;
  const tips = form.watch('tipsCents') ?? 0;
  const profit = cashout - buyin - tips;
  const hourly = elapsedHours > 0 ? profit / elapsedHours : 0;

  useEffect(() => {
    if (!running && !form.getValues('endTs')) {
      form.setValue('endTs', dayjs().toISOString());
    }
  }, [running, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CashSession = {
      id: session?.id ?? 'local-' + Date.now(),
      userId,
      startTs: values.startTs,
      endTs: values.running ? undefined : values.endTs ?? dayjs().toISOString(),
      venue: values.venue ?? undefined,
      game: values.game ?? undefined,
      sbCents: Number(values.sbCents),
      bbCents: Number(values.bbCents),
      buyinCents: Number(values.buyinCents),
      cashoutCents: values.cashoutCents ? Number(values.cashoutCents) : undefined,
      tipsCents: values.tipsCents ? Number(values.tipsCents) : undefined,
      notes: values.notes ?? undefined,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      updatedAt: dayjs().toISOString(),
      dirty: true,
      durationMinutes: values.running
        ? Math.max(0, Math.round(elapsedSeconds / 60))
        : session?.durationMinutes ?? Math.max(0, Math.round(elapsedSeconds / 60))
    };

    if (session) {
      updateCash(session.id, payload);
      const merged = { ...session, ...payload };
      await upsertCashSession(merged);
      await queueMutation('cash_sessions', 'update', session.id, merged as any);
      onSaved(merged);
    } else {
      const stored = addCash(payload);
      await upsertCashSession(stored);
      await queueMutation('cash_sessions', 'insert', stored.id, stored as any);
      onSaved(stored);
    }
    setDefaults({
      venue: payload.venue,
      game: payload.game,
      sbCents: payload.sbCents,
      bbCents: payload.bbCents,
      buyInCents: payload.buyinCents
    });
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cash session</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>Live timer</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{formatElapsed(elapsedSeconds)}</Text>
        <Controller
          control={form.control}
          name="running"
          render={({ field: { value, onChange } }) => (
            <View style={styles.switchWrapper}>
              <Switch value={value} onValueChange={onChange} accessibilityLabel="Running session" />
            </View>
          )}
        />
      </View>
      {renderInput(form, 'venue', 'Venue')}
      {renderInput(form, 'game', 'Game')}
      <View style={styles.inlineInputs}>
        {renderInput(form, 'sbCents', 'SB (¢)', 'numeric', false, styles.inlineField)}
        {renderInput(form, 'bbCents', 'BB (¢)', 'numeric', false, styles.inlineField)}
      </View>
      <View style={styles.inlineInputs}>
        {renderInput(form, 'buyinCents', 'Buy-in (¢)', 'numeric', false, styles.inlineField)}
        {renderInput(form, 'cashoutCents', 'Cash-out (¢)', 'numeric', false, styles.inlineField)}
      </View>
      {renderInput(form, 'tipsCents', 'Tips (¢)', 'numeric')}
      {renderInput(form, 'tags', 'Tags (comma separated)')}
      {renderInput(form, 'notes', 'Notes', 'default', true)}
      <View style={styles.summaryRow}>
        <SummaryChip label="Net" value={formatCurrency(profit)} tone={profit >= 0 ? 'success' : 'danger'} />
        <SummaryChip label="Hourly" value={formatCurrency(hourly)} />
      </View>
      <Pressable
        onPress={onSubmit}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor: pressed ? theme.colors.primary + 'cc' : theme.colors.primary
          }
        ]}
      >
        <Text style={styles.submitLabel}>{session ? 'Update session' : 'Save session'}</Text>
      </Pressable>
    </View>
  );
}

function renderInput(
  form: ReturnType<typeof useForm<CashSessionFormValues>>,
  name: keyof CashSessionFormValues,
  label: string,
  keyboardType: 'default' | 'numeric' = 'default',
  multiline = false,
  containerStyle?: StyleProp<ViewStyle>
) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={[styles.field, containerStyle]}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TextInput
            value={value ? String(value) : ''}
            onChangeText={onChange}
            style={[styles.input, multiline && styles.textarea]}
            keyboardType={keyboardType}
            multiline={multiline}
            accessibilityLabel={label}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
        </View>
      )}
    />
  );
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function SummaryChip({
  label,
  value,
  tone = 'default'
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const theme = useTheme();
  const color =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
      ? theme.colors.danger
      : theme.colors.primary;
  return (
    <View style={[styles.summaryChip, { borderColor: color }]}
      accessibilityRole="text"
    >
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginBottom: 16
  },
  label: {
    flexShrink: 1,
    fontSize: 16,
    marginRight: 12
  },
  value: {
    fontVariant: ['tabular-nums'],
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12
  },
  switchWrapper: {
    marginLeft: 12,
    paddingTop: 4
  },
  inlineInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 0
  },
  inlineField: {
    width: '48%',
    marginBottom: 12
  },
  field: {
    width: '100%',
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6
  },
  input: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16
  },
  textarea: {
    minHeight: 112
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 4,
    marginBottom: 8
  },
  summaryChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
    minWidth: '48%',
    marginHorizontal: 6,
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 13,
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600'
  },
  submit: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  submitLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17
  }
});
