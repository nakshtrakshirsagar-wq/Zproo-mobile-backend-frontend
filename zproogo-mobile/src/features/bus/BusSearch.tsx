import React from 'react';
import { Screen, Txt } from '../../components/ui';
import { BusSearchCard } from '../../components/BusSearchCard';

export type { BusQuery } from '../../components/BusSearchCard';
/** Kept so older imports keep working; the form now lives in components/BusSearchCard. */
export const BusSearchForm = BusSearchCard;

export function BusSearchScreen({ navigation, route }: any) {
  return (
    <Screen title="Bus">
      <Txt v="title" color="#D90404">Bus</Txt>
      <Txt muted>2,500+ operators · live tracking · instant refunds</Txt>
      <BusSearchCard initialWomen={route.params?.women} onSearch={(q) => navigation.navigate('BusResults', q)} />
    </Screen>
  );
}
