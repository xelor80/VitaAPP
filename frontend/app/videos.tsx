import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Linking, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLang } from '../src/LangContext';
import { StyleSheet } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Video {
  video_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  description: string;
  category: string;
  lang: string;
  duration: string;
  tags: string[];
}

interface VideoCategory {
  category_id: string;
  name_de: string;
  name_it: string;
  icon: string;
  videos: Video[];
}

const CATEGORY_ICONS: Record<string, string> = {
  articolazioni: 'bone',
  digestione: 'stomach',
  peso: 'scale-bathroom',
  cuore: 'heart-pulse',
  energia: 'lightning-bolt',
  pelle: 'face-woman',
  immunsystem: 'shield-check',
  schlaf: 'sleep',
  memoria: 'brain',
  allgemein: 'information',
};

export default function VideosScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [lang]);

  const loadVideos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/videos/by-category/${lang}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          setExpandedCategory(data[0].category_id);
        }
      }
    } catch (e) {
      console.error('Videos error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategory(expandedCategory === catId ? null : catId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D14953" testID="loading-indicator" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {lang === 'de' ? 'Videos & Tipps' : 'Video e consigli'}
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="youtube" size={32} color="#FF0000" />
          <Text style={styles.infoTitle}>
            {lang === 'de' ? 'Expertenvideos' : 'Video esperti'}
          </Text>
          <Text style={styles.infoText}>
            {lang === 'de'
              ? 'Lernen Sie von Joachim Kaeser über Nahrungsergänzungsmittel und natürliche Gesundheit.'
              : 'Scopri gli integratori e la salute naturale con Joachim Kaeser.'}
          </Text>
        </View>

        {/* Empty State */}
        {categories.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="video-off-outline" size={48} color="#8FA39B" />
            <Text style={styles.emptyTitle}>
              {lang === 'de' ? 'Keine Videos verfügbar' : 'Nessun video disponibile'}
            </Text>
            <Text style={styles.emptyText}>
              {lang === 'de'
                ? 'Schauen Sie später noch einmal vorbei.'
                : 'Torna più tardi.'}
            </Text>
          </View>
        )}

        {/* Categories with Videos */}
        {categories.map((cat) => (
          <View key={cat.category_id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat.category_id)}
              activeOpacity={0.7}
              testID={`category-${cat.category_id}`}
            >
              <View style={styles.categoryIconContainer}>
                <MaterialCommunityIcons
                  name={CATEGORY_ICONS[cat.category_id] || 'information'}
                  size={22}
                  color="#D14953"
                />
              </View>
              <Text style={styles.categoryTitle}>
                {lang === 'de' ? cat.name_de : cat.name_it}
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{cat.videos.length}</Text>
              </View>
              <MaterialCommunityIcons
                name={expandedCategory === cat.category_id ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#8FA39B"
              />
            </TouchableOpacity>

            {expandedCategory === cat.category_id && (
              <View style={styles.videosList}>
                {cat.videos.map((video) => (
                  <TouchableOpacity
                    key={video.video_id}
                    style={styles.videoCard}
                    onPress={() => openVideo(video.youtube_url)}
                    activeOpacity={0.8}
                    testID={`video-${video.video_id}`}
                  >
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg` }}
                      style={styles.thumbnail}
                    />
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      {video.description && (
                        <Text style={styles.videoDescription} numberOfLines={2}>
                          {video.description}
                        </Text>
                      )}
                      {video.duration && (
                        <View style={styles.durationBadge}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color="#5C7A6F" />
                          <Text style={styles.durationText}>{video.duration}</Text>
                        </View>
                      )}
                    </View>
                    <MaterialCommunityIcons name="play-circle" size={28} color="#FF0000" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2D26',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2D26',
    marginTop: 10,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#5C7A6F',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D26',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#5C7A6F',
    marginTop: 6,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D26',
  },
  categoryBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D14953',
  },
  videosList: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  thumbnail: {
    width: 100,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D26',
    lineHeight: 18,
  },
  videoDescription: {
    fontSize: 12,
    color: '#5C7A6F',
    marginTop: 4,
    lineHeight: 16,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#5C7A6F',
    marginLeft: 4,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  channelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginLeft: 12,
  },
});
