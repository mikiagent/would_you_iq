import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { EssentialStar } from '@/components/ui';

type Side = 'A' | 'B';

type ArenaCardProps = {
  task: Task;
  side: Side;
  onToggleEssential: () => void;
  /** When set, show modified/penalized price tag */
  priceOverride?: { display: string; unit: string; tickDir: 'up' | 'dn' };
};

export function ArenaCard({
  task,
  side,
  onToggleEssential,
  priceOverride,
}: ArenaCardProps) {
  const priceDisplay = priceOverride?.display ?? task.timeEstimate;
  const unit = priceOverride?.unit ?? 'time cost';
  const isModified = priceOverride && priceOverride.tickDir === 'dn';
  const isPenalized = priceOverride && priceOverride.tickDir === 'up';

  return (
    <View style={[styles.card, side === 'A' ? styles.cardA : styles.cardB]}>
      <View style={[styles.optLabel, side === 'A' ? styles.optLabelA : styles.optLabelB]}>
        <Text style={side === 'A' ? styles.optLabelTextA : styles.optLabelTextB}>
          Option {side}
        </Text>
      </View>
      <Text style={styles.optEmoji}>{task.emoji}</Text>
      <Text style={styles.optName} numberOfLines={2}>
        {task.name}
      </Text>
      <View
        style={[
          styles.priceTag,
          isModified && styles.priceTagModified,
          isPenalized && styles.priceTagPenalized,
        ]}
      >
        <Text
          style={[
            styles.priceMain,
            isModified && styles.priceMainModified,
            isPenalized && styles.priceMainPenalized,
          ]}
        >
          {priceDisplay}
        </Text>
        <Text style={styles.priceUnit}>{unit}</Text>
        {priceOverride && (
          <Text
            style={[
              styles.priceTick,
              priceOverride.tickDir === 'up' ? styles.tickUp : styles.tickDn,
            ]}
          >
            {priceOverride.tickDir === 'up' ? '▲' : '▼'}
          </Text>
        )}
      </View>
      <View style={styles.essWrap}>
        <EssentialStar essential={task.essential} onToggle={onToggleEssential} size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardA: {
    backgroundColor: '#0e0820',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  cardB: {
    backgroundColor: '#080f1e',
    borderColor: 'rgba(59,130,246,0.25)',
  },
  optLabel: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
    marginBottom: 8,
  },
  optLabelA: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  optLabelTextA: {
    fontSize: 8,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 2,
    color: Colors.violet,
  },
  optLabelB: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  optLabelTextB: {
    fontSize: 8,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 2,
    color: '#93c5fd',
  },
  optEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  optName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    flex: 1,
    color: Colors.t1,
  },
  priceTag: {
    width: '100%',
    backgroundColor: Colors.s2,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: Colors.b2,
    alignItems: 'center',
  },
  priceTagModified: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: 'rgba(52,211,153,0.35)',
  },
  priceTagPenalized: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderColor: 'rgba(248,113,113,0.35)',
  },
  priceMain: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    color: Colors.t1,
  },
  priceMainModified: {
    color: Colors.green,
    fontSize: 17,
  },
  priceMainPenalized: {
    color: Colors.red,
    fontSize: 17,
  },
  priceUnit: {
    fontSize: 7,
    fontFamily: Fonts.bodyBold,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  priceTick: {
    position: 'absolute',
    top: 5,
    right: 7,
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
  },
  tickUp: { color: Colors.red },
  tickDn: { color: Colors.green },
  essWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
