import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Chevron } from '../Chevron';
import { DashedLine } from '../DashedLine';
import { FONT, type } from '../../theme/typography';
import { useBusUi } from '../BusResult/busResultTheme';

/** Collapsible filter group (the <details> blocks of bus-filters-only.html): title + red count badge + chevron. */
export function FilterSection({ title, count = 0, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const ui = useBusUi();
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View>
      <View style={{ height: 1, backgroundColor: ui.line }} />
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT.uiSemi, fontSize: 13, letterSpacing: 0.5, color: ui.body, textTransform: 'uppercase' }}>{title}</Text>
          {count > 0 && (
            <View style={{ backgroundColor: ui.red, borderRadius: 10, minWidth: 20, height: 18, paddingHorizontal: 6, marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...type('label', 11), color: '#fff' }}>{count}</Text>
            </View>
          )}
        </View>
        <Chevron color={ui.muted} open={open} size={18} />
      </Pressable>
      {open && <View style={{ paddingBottom: 12 }}>{children}</View>}
    </View>
  );
}
