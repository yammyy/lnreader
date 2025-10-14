import React, { useState, useEffect } from 'react';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (path: string, name: string) => void;
  initialPath?: string;
  initialName?: string;
  title?: string;
}

const AddChapterModal: React.FC<Props> = ({
  visible,
  onDismiss,
  onSave,
  initialPath = '',
  initialName = '',
  title = 'Add Chapter',
}) => {
  const [path, setPath] = useState(initialPath);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setPath(initialPath);
      setName(initialName);
    }
  }, [visible, initialPath, initialName]);

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
        <Text style={{ fontSize: 18, marginBottom: 12 }}>{title}</Text>

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
