import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { colors } from '@/constants/colors';

interface ProductItem {
  id: string;
  title: string;
  url: string;
  price?: number | null;
  currency?: string | null;
  merchant?: string | null;
  image?: string | null;
  snippet?: string | null;
}

export default function ProductAlternativesCarousel({ data }: { data: ProductItem[] }) {
  if (!data || data.length === 0) return null;

  const openLink = (url?: string) => {
    if (!url || url === '#') return;
    Linking.openURL(url).catch(err => console.warn('Failed to open URL', err));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alternative products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {data.map((item) => (
          <View key={item.id} style={styles.card}>
            <TouchableOpacity onPress={() => openLink(item.url)} activeOpacity={0.8} style={styles.imageWrapper}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
            </TouchableOpacity>
            <View style={styles.cardContent}>
              <Text numberOfLines={2} style={styles.productTitle}>{item.title}</Text>
              {item.merchant ? <Text style={styles.merchant}>{item.merchant}</Text> : null}
              {item.price != null ? (
                <Text style={styles.price}>{(item.currency || '$')}{Number(item.price).toFixed(2)}</Text>
              ) : null}
              <TouchableOpacity style={styles.buyButton} onPress={() => openLink(item.url)}>
                <Text style={styles.buyText}>Explore</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[400],
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scroll: {
    gap: 12,
  },
  card: {
    width: 220,
    backgroundColor: colors.neutral[700],
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: colors.neutral[600],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[600],
  },
  cardContent: {
    padding: 10,
    gap: 6,
  },
  productTitle: {
    color: colors.neutral[100],
    fontSize: 13,
    fontWeight: '600',
  },
  merchant: {
    color: colors.neutral[400],
    fontSize: 12,
  },
  price: {
    color: colors.primary[300],
    fontSize: 14,
    fontWeight: '700',
  },
  buyButton: {
    marginTop: 8,
    backgroundColor: colors.primary[500],
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyText: {
    color: colors.neutral[100],
    fontWeight: '700',
  },
});
