import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomNavBar from './CustomNavBar';

/**
 * A wrapper component that adds the CustomNavBar to any screen
 * @param {string} activeScreen - The name of the active screen
 * @param {React.ReactNode} children - The screen content
 */
const ScreenWithNavBar = ({ activeScreen, children }) => {
  return (
    <View style={styles.container}>
      {children}
      <CustomNavBar activeScreen={activeScreen} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenWithNavBar; 