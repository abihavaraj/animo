import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Paragraph, Title } from 'react-native-paper';

function ReportsAnalytics() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Reports & Analytics</Title>
        <Paragraph style={styles.headerSubtitle}>Studio performance insights and reports</Paragraph>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Revenue Analytics</Title>
          <Paragraph>Monthly revenue tracking and trends</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Class Analytics</Title>
          <Paragraph>Class attendance and popularity metrics</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>User Analytics</Title>
          <Paragraph>User engagement and retention statistics</Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  card: {
    margin: 15,
    marginTop: 0,
  },
});

export default ReportsAnalytics; 