import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './homeStyles';

interface SupplementPlanButtonProps {
  lang: string;
  refreshKey?: number;
  onPress: () => void;
  onNoProfile: () => void;
}

export function SupplementPlanButton({ lang, refreshKey, onPress, onNoProfile }: SupplementPlanButtonProps) {
  const [hasProfile, setHasProfile] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(val => {
      setHasProfile(!!val);
    }).catch(() => {});
  }, [refreshKey]);

  const handlePress = () => {
    if (hasProfile) {
      onPress();
    } else {
      setShowAlert(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        testID="supplement-plan-home-btn"
        style={styles.supplementPlanButton}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.supplementPlanIconWrap}>
          <MaterialCommunityIcons name="pill" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.supplementPlanBtnTitle}>
            {lang === 'de' ? 'Supplement-Plan' : 'Piano supplementi'}
          </Text>
          <Text style={styles.supplementPlanBtnSub} numberOfLines={1}>
            {lang === 'de' ? '8-Wochen Mikronaehrstoff-Plan' : 'Piano personalizzato di 8 settimane'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {showAlert && (
        <Modal transparent animationType="fade" visible={showAlert} onRequestClose={() => setShowAlert(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAlert(false)}
          >
            <View style={styles.alertCard}>
              <MaterialCommunityIcons name="clipboard-alert-outline" size={40} color="#F59E0B" />
              <Text style={styles.alertTitle}>
                {lang === 'de' ? 'Gesundheits-Check erforderlich' : 'Check salute necessario'}
              </Text>
              <Text style={styles.alertText}>
                {lang === 'de'
                  ? 'Bitte fuehren Sie zuerst den Gesundheits-Check durch, damit wir Ihren personalisierten Supplement-Plan erstellen koennen.'
                  : 'Esegui prima il check salute per creare il tuo piano supplementi personalizzato.'}
              </Text>
              <TouchableOpacity
                testID="alert-start-check-btn"
                style={styles.alertBtn}
                onPress={() => { setShowAlert(false); onNoProfile(); }}
              >
                <MaterialCommunityIcons name="clipboard-pulse" size={18} color="#FFFFFF" />
                <Text style={styles.alertBtnText}>
                  {'  '}{lang === 'de' ? 'Gesundheits-Check starten' : 'Avvia check salute'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertDismiss} onPress={() => setShowAlert(false)}>
                <Text style={styles.alertDismissText}>{lang === 'de' ? 'Spaeter' : 'Dopo'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}
