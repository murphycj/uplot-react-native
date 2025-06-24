import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ChartUPlot } from 'uplot-react-native';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ChartUPlot
        data={[
          [
            1672531200000, 1672617600000, 1672704000000, 1672790400000,
            1672876800000, 1672963200000, 1673049600000, 1673136000000,
            1673222400000, 1673308800000,
          ],
          [10, 15, 13, 17, 14, 18, 16, 19, 15, 20],
        ]}
        options={{
          id: 'chart',
          width: 300,
          height: 300,
          scales: { x: { time: true } },
          series: [
            { label: 'Time' },
            { label: 'Value', stroke: 'blue', width: 2 },
          ],
          axes: [{ scale: 'x' }, {}],
        }}
        style={{
          width: 300,
          height: 300,
        }}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
