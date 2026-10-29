import { ScrollView, Text, StyleSheet } from 'react-native';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'How it works',
    body:
      'Start a round and put your phone away. Club Check watches where you stop. The first stop on each hole is the tee. When you spend time on the green and then walk or drive away, your phone says "Club Check" so you look in your bag before you go.',
  },
  {
    title: 'It gets smarter at each course',
    body:
      'The first time you play a course, Club Check figures out the greens as you go. When you tap "All Clubs Accounted For", it remembers that green, so your next round there is more accurate.',
  },
  {
    title: 'Wrong spot?',
    body:
      'If a reminder comes somewhere that wasn\'t a green (a long wait in the fairway, for example), tap "This wasn\'t the green". Club Check puts you back on the right hole and won\'t learn that spot.',
  },
  {
    title: 'Hole number off?',
    body:
      'Holes advance on their own after each green. If you skip a hole or start on the back nine, use the arrows on the round screen to fix it.',
  },
  {
    title: 'Location set to "Always"',
    body:
      'Your phone is usually locked in a pocket or bag when you leave a green, so Club Check needs location access while it\'s in the background. It only uses location during a round you start, and stops when you end the round.',
  },
  {
    title: 'Battery',
    body: 'GPS during a full round uses some battery. End the round when you finish so monitoring stops.',
  },
  {
    title: 'Privacy',
    body: 'No account, no cloud, no ads. Your rounds and learned greens never leave your phone.',
  },
];

export default function HelpScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {SECTIONS.map((s) => (
        <Text key={s.title} style={styles.block}>
          <Text style={styles.title}>{s.title}{'\n'}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  block: { marginBottom: 22 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, color: '#444', lineHeight: 22 },
});
