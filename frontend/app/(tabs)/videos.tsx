import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Modal, Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useLang } from '../../src/LangContext';

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

export default function VideosTab() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [lang]);

  useEffect(() => { loadVideos(); }, [loadVideos]);
  useFocusEffect(useCallback(() => { loadVideos(); }, [loadVideos]));

  const openVideo = (video: Video) => setActiveVideo(video);
  const closeVideo = () => setActiveVideo(null);
  const toggleCategory = (catId: string) => {
    setExpandedCategory(expandedCategory === catId ? null : catId);
  };

  const playerWidth = Math.min(winW - 32, 720);
  const playerHeight = Math.round(playerWidth * 9 / 16);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C2272F" testID="videos-loading-indicator" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="play-circle" size={28} color="#C2272F" />
            <Text style={styles.headerTitle} testID="videos-tab-title">
              {lang === 'de' ? 'Coach‑TV' : 'Coach‑TV'}
            </Text>
          </View>
        </View>

        {/* Hero info card */}
        <View style={styles.infoCard} testID="videos-hero-card">
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="youtube" size={20} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>
              {lang === 'de' ? 'Expertenwissen' : 'Esperto'}
            </Text>
          </View>
          <Text style={styles.infoTitle}>
            {lang === 'de'
              ? 'Joachim Kaeser erklärt'
              : 'Joachim Kaeser spiega'}
          </Text>
          <Text style={styles.infoText}>
            {lang === 'de'
              ? 'Erfahre direkt vom Experten, wobei dir welche Nahrungsergänzungen wirklich helfen können.'
              : 'Scopri direttamente dall\'esperto come gli integratori possono aiutarti davvero.'}
          </Text>
        </View>

        {/* Empty state */}
        {categories.length === 0 && (
          <View style={styles.emptyCard} testID="videos-empty-card">
            <MaterialCommunityIcons name="video-off-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {lang === 'de' ? 'Noch keine Videos verfügbar' : 'Nessun video disponibile'}
            </Text>
            <Text style={styles.emptyText}>
              {lang === 'de'
                ? 'Schau bald wieder rein – neue Folgen kommen regelmäßig.'
                : 'Torna presto – nuovi episodi in arrivo.'}
            </Text>
          </View>
        )}

        {/* Categories with Videos */}
        {categories.map((cat) => (
          <View key={cat.category_id} style={styles.categoryCard} testID={`videos-category-card-${cat.category_id}`}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat.category_id)}
              activeOpacity={0.7}
              testID={`videos-category-toggle-${cat.category_id}`}
            >
              <View style={styles.categoryIconContainer}>
                <MaterialCommunityIcons
                  name={(CATEGORY_ICONS[cat.category_id] || 'information') as any}
                  size={22}
                  color="#C2272F"
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
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {expandedCategory === cat.category_id && (
              <View style={styles.videosList}>
                {cat.videos.map((video) => (
                  <TouchableOpacity
                    key={video.video_id}
                    style={styles.videoCard}
                    onPress={() => openVideo(video)}
                    activeOpacity={0.85}
                    testID={`video-card-${video.video_id}`}
                  >
                    <View style={styles.thumbnailWrap}>
                      <Image
                        source={{ uri: `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg` }}
                        style={styles.thumbnail}
                      />
                      <View style={styles.thumbnailOverlay}>
                        <MaterialCommunityIcons name="play-circle" size={36} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      {video.description ? (
                        <Text style={styles.videoDescription} numberOfLines={2}>
                          {video.description}
                        </Text>
                      ) : null}
                      {video.duration ? (
                        <View style={styles.durationBadge}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color="#6B7280" />
                          <Text style={styles.durationText}>{video.duration}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Inline YouTube Player Modal */}
      <Modal
        visible={!!activeVideo}
        transparent
        animationType="fade"
        onRequestClose={closeVideo}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="video-player-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {activeVideo?.title}
              </Text>
              <TouchableOpacity onPress={closeVideo} style={styles.closeBtn} testID="video-player-close-btn">
                <MaterialCommunityIcons name="close" size={22} color="#1A2E35" />
              </TouchableOpacity>
            </View>

            {activeVideo && (
              <View style={[styles.playerWrap, { width: playerWidth, height: playerHeight }]}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore – iframe on web
                  <iframe
                    width={playerWidth}
                    height={playerHeight}
                    src={`https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title={activeVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ borderRadius: 12 }}
                  />
                ) : (
                  <WebView
                    style={{ width: playerWidth, height: playerHeight, borderRadius: 12, backgroundColor: '#000' }}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    source={{
                      uri: `https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
                    }}
                  />
                )}
              </View>
            )}

            {activeVideo?.description ? (
              <Text style={styles.modalDescription} numberOfLines={4}>
                {activeVideo.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A2E35', letterSpacing: 0.3 },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#C2272F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#C2272F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
    gap: 6,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  infoTitle: { fontSize: 20, fontWeight: '800', color: '#1A2E35', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A2E35', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  categoryIconContainer: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A2E35' },
  categoryBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  categoryBadgeText: { fontSize: 13, fontWeight: '700', color: '#C2272F' },
  videosList: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },

  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  thumbnailWrap: { position: 'relative' },
  thumbnail: {
    width: 110, height: 62, borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  thumbnailOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 8,
  },
  videoInfo: { flex: 1, marginRight: 4 },
  videoTitle: { fontSize: 14, fontWeight: '700', color: '#1A2E35', lineHeight: 18 },
  videoDescription: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 16 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  durationText: { fontSize: 11, color: '#6B7280' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    width: '100%',
    maxWidth: 760,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A2E35', lineHeight: 22 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  playerWrap: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', alignSelf: 'center' },
  modalDescription: { fontSize: 13, color: '#4B5563', marginTop: 12, lineHeight: 18 },
});
