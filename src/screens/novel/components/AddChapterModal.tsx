import React, { useState } from 'react';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (path: string, name: string) => void;
}

const AddChapterModal: React.FC<Props> = ({ visible, onDismiss, onSave }) => {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');

  const handleSave = () => {
    if (path.trim() && name.trim()) {
      onSave(path.trim(), name.trim());
      setPath('');
      setName('');
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setPath('');
    setName('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={{
          padding: 20,
          backgroundColor: 'white',
          margin: 20,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 12 }}>Add Chapter</Text>

        <TextInput
          label="Chapter Path"
          value={path}
          onChangeText={setPath}
          mode="outlined"
          style={{ marginBottom: 12 }}
        />

        <TextInput
          label="Chapter Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={{ marginBottom: 20 }}
        />

        <Button mode="contained" onPress={handleSave}>
          Save
        </Button>
      </Modal>
    </Portal>
  );
};

export default AddChapterModal;
