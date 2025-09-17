import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from '@/utils/dayjs';
import { useTheme } from '@/theme';
import type { MttSession } from '@/types';
import { useSessionStore } from '@/store/sessionStore';
import { upsertMttSession } from '@/db/repository';
import { queueMutation } from '@/sync/mutationHelpers';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  startTs: z.string(),
  endTs: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  game: z.string().optional().nullable(),
  buyinCents: z.coerce.number().min(0),
  feeCents: z.coerce.number().min(0).optional().nullable(),
  reentries: z.coerce.number().int().min(0).default(0),
  cashCents: z.coerce.number().min(0).optional().nullable(),
  bountiesCents: z.coerce.number().min(0).optional().nullable(),
  position: z.coerce.number().int().min(0).optional().nullable(),
  fieldSize: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable()
});

export type MttSessionFormValues = z.infer<typeof schema>;

interface Props {
  session?: MttSession;
  onSaved: (session: MttSession) => void;
}

export default function MttSessionForm({ session, onSaved }: Props) {
  const theme = useTheme();
  const addMtt = useSessionStore((state) => state.addMttSession);
  const updateMtt = useSessionStore((state) => state.updateMttSession);
  const userId = useAuthStore((state) => state.user?.id ?? 'me');

  const form = useForm<MttSessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startTs: session?.startTs ?? dayjs().toISOString(),
      endTs: session?.endTs ?? dayjs().toISOString(),
      venue: session?.venue ?? '',
      game: session?.game ?? 'NLH',
      buyinCents: session?.buyinCents ?? 10000,
      feeCents: session?.feeCents ?? 0,
      reentries: session?.reentries ?? 0,
      cashCents: session?.cashCents ?? 0,
      bountiesCents: session?.bountiesCents ?? 0,
      position: session?.position ?? undefined,
      fieldSize: session?.fieldSize ?? undefined,
      notes: session?.notes ?? '',
      tags: session?.tags?.join(', ') ?? ''
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: MttSession = {
      id: session?.id ?? 'mtt-' + Date.now(),
      userId,
      startTs: values.startTs,
      endTs: values.endTs ?? dayjs().toISOString(),
      venue: values.venue ?? undefined,
      game: values.game ?? undefined,
      buyinCents: Number(values.buyinCents),
      feeCents: values.feeCents ? Number(values.feeCents) : undefined,
      reentries: Number(values.reentries ?? 0),
      cashCents: values.cashCents ? Number(values.cashCents) : undefined,
      bountiesCents: values.bountiesCents ? Number(values.bountiesCents) : undefined,
      position: values.position ? Number(values.position) : undefined,
      fieldSize: values.fieldSize ? Number(values.fieldSize) : undefined,
      notes: values.notes ?? undefined,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      updatedAt: dayjs().toISOString(),
      dirty: true
    };
    if (session) {
      updateMtt(session.id, payload);
      const merged = { ...session, ...payload };
      await upsertMttSession(merged);
      await queueMutation('mtt_sessions', 'update', session.id, merged as any);
      onSaved(merged);
    } else {
      const stored = addMtt(payload);
      await upsertMttSession(stored);
      await queueMutation('mtt_sessions', 'insert', stored.id, stored as any);
      onSaved(stored);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Tournament session</Text>
      {renderInput(form, 'venue', 'Venue')}
      {renderInput(form, 'game', 'Game')}
      <View style={styles.inline}>{renderInput(form, 'buyinCents', 'Buy-in (¢)', 'numeric')}{renderInput(form, 'feeCents', 'Fee (¢)', 'numeric')}</View>
      <View style={styles.inline}>{renderInput(form, 'reentries', 'Re-entries', 'numeric')}{renderInput(form, 'cashCents', 'Cash (¢)', 'numeric')}</View>
      <View style={styles.inline}>{renderInput(form, 'bountiesCents', 'Bounties (¢)', 'numeric')}{renderInput(form, 'fieldSize', 'Field size', 'numeric')}</View>
      <View style={styles.inline}>{renderInput(form, 'position', 'Finish position', 'numeric')}</View>
      {renderInput(form, 'tags', 'Tags (comma separated)')}
      {renderInput(form, 'notes', 'Notes', 'default', true)}
      <Pressable
        accessibilityRole="button"
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor: pressed ? theme.colors.primary + 'cc' : theme.colors.primary
          }
        ]}
      >
        <Text style={styles.submitLabel}>{session ? 'Update tournament' : 'Save tournament'}</Text>
      </Pressable>
    </View>
  );
}

function renderInput(
  form: ReturnType<typeof useForm<MttSessionFormValues>>,
  name: keyof MttSessionFormValues,
  label: string,
  keyboardType: 'default' | 'numeric' = 'default',
  multiline = false
) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TextInput
            value={value ? String(value) : ''}
            onChangeText={onChange}
            style={[styles.input, multiline && styles.textarea]}
            keyboardType={keyboardType}
            multiline={multiline}
            accessibilityLabel={label}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  inline: {
    flexDirection: 'row',
    gap: 12
  },
  inputWrapper: {
    flex: 1
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 4
  },
  input: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  textarea: {
    height: 88
  },
  submit: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  submitLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17
  }
});
