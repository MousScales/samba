import React from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { Text, useTheme } from '@rneui/themed';

const timeFilters = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This Week' },
  { id: 'weekend', label: 'Weekend' },
];

const priceFilters = [
  { id: 'all', label: 'Any Price' },
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
];

const EventFilters = ({
  selectedTime = 'all',
  selectedPrice = 'all',
  onTimeFilterChange,
  onPriceFilterChange,
}) => {
  const { theme } = useTheme();

  const renderFilterItem = (item, isSelected, onPress) => (
    <TouchableOpacity
      style={[
        styles.filterItem,
        { backgroundColor: theme.colors.surfaceLight },
        isSelected && { backgroundColor: theme.colors.primary },
      ]}
      onPress={() => onPress(item.id)}
    >
      <Text
        style={[
          styles.filterText,
          { color: theme.colors.textSecondary },
          isSelected && { color: theme.colors.text },
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.filterSection}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>When</Text>
        <FlatList
          data={timeFilters}
          renderItem={({ item }) => 
            renderFilterItem(
              item,
              selectedTime === item.id,
              onTimeFilterChange
            )
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          style={styles.filterList}
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Price</Text>
        <FlatList
          data={priceFilters}
          renderItem={({ item }) =>
            renderFilterItem(
              item,
              selectedPrice === item.id,
              onPriceFilterChange
            )
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          style={styles.filterList}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EventFilters; 