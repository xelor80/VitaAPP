import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, Platform, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// WebView nur für native Plattformen importieren
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Video {
  video_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  description: string;
  category: string;
  duration: string;
}

interface VideosSectionProps {
  videos: Video[];
  lang: string;
  title?: string;
}

export function VideosSection({ videos, lang, title }: VideosSectionProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playingTitle, setPlayingTitle] = useState<string>('');
  const [playingUrl, setPlayingUrl] = useState<string>('');

  const openVideo = (youtubeId: string, videoTitle: string, youtubeUrl: string) => {
    if (Platform.OS !== 'web' && !WebView) {
      // Fallback: Video in YouTube App/Browser öffnen
      Linking.openURL(youtubeUrl);
      return;
    }
    setPlayingVideoId(youtubeId);
    setPlayingTitle(videoTitle);
    setPlayingUrl(youtubeUrl);
  };

  const closeVideo = () => {
    setPlayingVideoId(null);
    setPlayingTitle('');
    setPlayingUrl('');
  };

  const openInYouTube = () => {
    if (playingUrl) {
      Linking.openURL(playingUrl);
      closeVideo();
    }
  };

  if (videos.length === 0) return null;

  const playerWidth = Platform.OS === 'web' 
    ? Math.min(SCREEN_WIDTH - 60, 600) 
    : SCREEN_WIDTH - 40;
  const playerHeight = playerWidth * 0.5625;

  const youtubeEmbedUrl = playingVideoId 
    ? `https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0&playsinline=1` 
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="youtube" size={22} color="#FF0000" />
        <Text style={styles.title}>
          {title || (lang === 'de' ? 'Passende Videos' : 'Video correlati')}
        </Text>
      </View>

      {videos.map((video) => (
        <TouchableOpacity
          key={video.video_id}
          style={styles.videoCard}
          onPress={() => openVideo(video.youtube_id, video.title, video.youtube_url)}
          activeOpacity={0.8}
          testID={`video-card-${video.video_id}`}
        >
          <View style={styles.thumbnailContainer}>
            <View style={styles.thumbnail}>
              <MaterialCommunityIcons name="play-circle" size={40} color="#FF0000" />
            </View>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
            {video.description && (
              <Text style={styles.videoDescription} numberOfLines={2}>{video.description}</Text>
            )}
            {video.duration && (
              <View style={styles.durationBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="#5C7A6F" />
                <Text style={styles.durationText}>{video.duration}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* Video Player Modal */}
      <Modal
        visible={!!playingVideoId}
        animationType="slide"
        transparent={true}
        onRequestClose={closeVideo}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Platform.OS !== 'web' && { width: SCREEN_WIDTH - 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {playingTitle}
              </Text>
              <TouchableOpacity onPress={closeVideo} style={styles.closeBtn} testID="close-video-btn">
                <MaterialCommunityIcons name="close" size={24} color="#1A2D26" />
              </TouchableOpacity>
            </View>
            
            {playingVideoId && (
              <View style={[styles.playerContainer, { width: playerWidth, height: playerHeight }]}>
                {Platform.OS === 'web' ? (
                  <div 
                    style={{ 
                      width: playerWidth, 
                      height: playerHeight, 
                      borderRadius: 8, 
                      overflow: 'hidden',
                      backgroundColor: '#000'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: `<iframe 
                        width="${playerWidth}" 
                        height="${playerHeight}" 
                        src="${youtubeEmbedUrl}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen
                        style="border-radius: 8px;">
                      </iframe>`
                    }}
                  />
                ) : WebView ? (
                  <WebView
                    source={{ uri: youtubeEmbedUrl }}
                    style={{ width: playerWidth, height: playerHeight, borderRadius: 8, backgroundColor: '#000' }}
                    allowsFullscreenVideo={true}
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                  />
                ) : (
                  <View style={[styles.playerContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="youtube" size={60} color="#FF0000" />
                    <Text style={{ color: '#FFF', marginTop: 10 }}>
                      {lang === 'de' ? 'Video nicht verfügbar' : 'Video non disponibile'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Button um Video in YouTube zu öffnen */}
            <TouchableOpacity style={styles.youtubeBtn} onPress={openInYouTube}>
              <MaterialCommunityIcons name="youtube" size={20} color="#FF0000" />
              <Text style={styles.youtubeBtnText}>
                {lang === 'de' ? 'In YouTube öffnen' : 'Apri in YouTube'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeFullBtn} onPress={closeVideo}>
              <Text style={styles.closeFullBtnText}>
                {lang === 'de' ? 'Schließen' : 'Chiudi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2D26',
    marginLeft: 8,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnailContainer: {
    width: 100,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  thumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2D26',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: Platform.OS === 'web' ? Math.min(SCREEN_WIDTH - 20, 680) : SCREEN_WIDTH - 20,
    maxWidth: 680,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D26',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeFullBtn: {
    backgroundColor: '#4A8B71',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeFullBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  youtubeBtnText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
