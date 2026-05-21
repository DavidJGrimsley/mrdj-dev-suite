import { StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

export function KeyboardForm() {
  return (
    <>
      <KeyboardAwareScrollView bottomOffset={72} contentContainerStyle={styles.form} style={styles.scroller}>
        <TextInput placeholder="Project note" style={styles.input} />
        <TextInput multiline placeholder="Details" style={[styles.input, styles.multiline]} />
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}

const styles = StyleSheet.create({
  scroller: {
    maxHeight: 220,
  },
  form: {
    gap: 12,
    paddingVertical: 8,
  },
  input: {
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  multiline: {
    minHeight: 88,
    paddingTop: 10,
    textAlignVertical: "top",
  },
});
