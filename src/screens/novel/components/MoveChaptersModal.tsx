import React, { useState, useEffect } from 'react';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onMove: (targetNovelId: string) => void;
}

const MoveChaptersModal: React.FC<Props> = ({
  visible,
  onDismiss,
  onMove,
}) => {
  const [targetNovelId, setTargetNovelId] = useState('');

  const handleMove = () => {
    if (targetNovelId.trim()) {
      onMove(targetNovelId);
      setTargetNovelId('');
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setTargetNovelId('');
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
        <Text style={{ fontSize: 18, marginBottom: 12 }}>Move chapters</Text>

        <TextInput
          label="Target novel ID"
          value={targetNovelId}
          onChangeText={setTargetNovelId}
          mode="outlined"
          style={{ marginBottom: 12 }}
        />

        <Button mode="contained" onPress={handleMove}>
          Move
        </Button>
      </Modal>
    </Portal>
  );
};

export default MoveChaptersModal;
