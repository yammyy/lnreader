import React, { useState, useEffect } from 'react';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (path: string, name: string, chapterNumber: string) => void;
  initialPath?: string;
  initialName?: string;
  initialChapterNumber?: string;
  title?: string;
}

const AddChapterModal: React.FC<Props> = ({
  visible,
  onDismiss,
  onSave,
  initialPath = '',
  initialName = '',
  initialChapterNumber = '',
  title = 'Add Chapter',
}) => {
  const [path, setPath] = useState(initialPath);
  const [name, setName] = useState(initialName);
  const [chapterNumber, setChapterNumber] = useState(initialChapterNumber);

  useEffect(() => {
    if (visible) {
      setPath(initialPath);
      setName(initialName);
      setChapterNumber(initialChapterNumber);
    }
  }, [visible, initialPath, initialName, initialChapterNumber]);

  const handleSave = () => {
    if (path.trim() && name.trim()) {
      onSave(path.trim(), name.trim(), chapterNumber.trim());
      setPath('');
      setName('');
      setChapterNumber('');
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setPath('');
    setName('');
    setChapterNumber('');
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

        <TextInput
          label="Chapter Number"
          value={chapterNumber}
          onChangeText={setChapterNumber}
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
