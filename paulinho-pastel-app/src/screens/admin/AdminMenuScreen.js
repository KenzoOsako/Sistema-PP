import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import Button from '../../components/Button';
import { subscribeToProducts, createProduct } from '../../adapters/ProductAdapter';

export default function AdminMenuScreen() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

  const handleAddProduct = async () => {
    if (!name || !price) {
      Alert.alert('Erro', 'Nome e Preço são obrigatórios!');
      return;
    }
    try {
      await createProduct({
        name,
        desc,
        price: parseFloat(price.replace(',', '.'))
      });
      setName('');
      setDesc('');
      setPrice('');
      Alert.alert('Sucesso', 'Pastel adicionado ao cardápio ao vivo!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productDesc}>{item.desc}</Text>
      <Text style={styles.productPrice}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cardápio Ao Vivo</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Novo Pastel</Text>
        <TextInput style={styles.input} placeholder="Nome (ex: Pastel de Carne)" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Descrição (ex: Carne e ovo)" value={desc} onChangeText={setDesc} />
        <TextInput style={styles.input} placeholder="Preço (ex: 9.50)" keyboardType="numeric" value={price} onChangeText={setPrice} />
        <Button title="Cadastrar Pastel" onPress={handleAddProduct} />
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  form: { padding: spacing.lg, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: colors.surface, height: 48, borderRadius: radii.sm, paddingHorizontal: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5E5' },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.sm, marginBottom: spacing.sm },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productDesc: { fontSize: 14, color: colors.textSecondary },
  productPrice: { fontSize: 16, color: colors.primary, fontWeight: 'bold', marginTop: 4 },
});
