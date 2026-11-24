import { Keyboard, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

export function KeyboardForm() {
  if (Platform.OS === 'web') {
    return (
      <ScrollView contentContainerStyle={styles.form} style={styles.scroller}>
        <TextInput
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Project note"
          returnKeyType="done"
          style={styles.input}
        />
        <TextInput
          blurOnSubmit
          multiline
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Details"
          returnKeyType="done"
          style={[styles.input, styles.multiline]}
        />
      </ScrollView>
    );
  }
  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={72}
        contentContainerStyle={styles.form}
        style={styles.scroller}>
        <TextInput
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Project note"
          returnKeyType="done"
          style={styles.input}
        />
        <TextInput
          blurOnSubmit
          multiline
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Details"
          returnKeyType="done"
          style={[styles.input, styles.multiline]}
        />
      </KeyboardAwareScrollView>
      <KeyboardToolbar onDoneCallback={Keyboard.dismiss} />
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
    textAlignVertical: 'top',
  },
});
