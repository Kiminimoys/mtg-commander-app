/**
 * CardScanner - Scanner de cartes MTG en continu
 * Utilise la caméra + Tesseract.js pour reconnaître les cartes
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Loader, Check, AlertCircle, Zap } from 'lucide-react';
import Tesseract from 'tesseract.js';

const CardScanner = ({ onCardScanned, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCard, setLastScannedCard] = useState(null);
  const [error, setError] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState([]); // Pour éviter les doublons immédiats
  
  // Référence pour le worker Tesseract (persistant)
  const workerRef = useRef(null);
  const scanningRef = useRef(false);
  const lastFrameDataRef = useRef(null);

  // Initialiser la caméra
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Caméra arrière sur mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Attendre que la vidéo soit prête
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              setIsLoading(false);
            }).catch(err => {
              console.error('Erreur play:', err);
              setIsLoading(false);
            });
          };
        }
      } catch (err) {
        console.error('Erreur caméra:', err);
        setError('Impossible d\'accéder à la caméra. Vérifie les permissions.');
        setIsLoading(false);
      }
    };

    initCamera();

    // Cleanup
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Initialiser le worker Tesseract
  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        workerRef.current = worker;
        console.log('✅ Tesseract worker prêt');
      } catch (err) {
        console.error('Erreur Tesseract:', err);
      }
    };
    initWorker();
  }, []);

  // Capturer une frame du flux vidéo
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas;
  }, []);

  // Extraire une zone spécifique de l'image
  const cropZone = useCallback((canvas, zone) => {
    const ctx = canvas.getContext('2d');
    const { x, y, width, height } = zone;
    
    // Créer un canvas temporaire pour la zone croppée
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    // Copier la zone
    croppedCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    
    // Preprocessing : augmenter le contraste et convertir en niveaux de gris
    const imageData = croppedCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convertir en niveaux de gris
      const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      
      // Augmenter le contraste (binarisation avec seuil)
      const threshold = 128;
      const value = gray > threshold ? 255 : 0;
      
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
    
    croppedCtx.putImageData(imageData, 0, 0);
    
    return croppedCanvas;
  }, []);

  // Calculer les zones de la carte (basé sur les proportions standard MTG)
  const getCardZones = useCallback((canvas) => {
    const w = canvas.width;
    const h = canvas.height;
    
    // On suppose que la carte occupe ~60% du centre de l'image
    const cardX = w * 0.2;
    const cardY = h * 0.1;
    const cardW = w * 0.6;
    const cardH = h * 0.8;
    
    return {
      // Zone du nom (en haut de la carte, ~10% de la hauteur)
      name: {
        x: cardX,
        y: cardY,
        width: cardW * 0.75, // Pas tout la largeur (le coût de mana est à droite)
        height: cardH * 0.08
      },
      // Zone de la ligne du bas (~5% en bas)
      bottomLine: {
        x: cardX,
        y: cardY + cardH * 0.92,
        width: cardW,
        height: cardH * 0.06
      }
    };
  }, []);

  // OCR sur une zone
  const performOCR = useCallback(async (canvas) => {
    if (!workerRef.current) return '';
    
    try {
      const { data: { text } } = await workerRef.current.recognize(canvas);
      return text.trim();
    } catch (err) {
      console.error('Erreur OCR:', err);
      return '';
    }
  }, []);

  // Rechercher la carte sur Scryfall
  const searchScryfall = useCallback(async (cardName, collectorNumber = null, setCode = null) => {
    try {
      // Nettoyer le nom (enlever les caractères parasites de l'OCR)
      const cleanName = cardName
        .replace(/[^a-zA-Z\s'-]/g, '')
        .trim();
      
      if (cleanName.length < 3) return null;
      
      // Si on a le numéro de collection et le set
      if (collectorNumber && setCode) {
        const exactUrl = `https://api.scryfall.com/cards/${setCode.toLowerCase()}/${collectorNumber}`;
        const exactRes = await fetch(exactUrl);
        if (exactRes.ok) {
          return await exactRes.json();
        }
      }
      
      // Sinon recherche fuzzy par nom
      const searchUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`;
      const res = await fetch(searchUrl);
      
      if (res.ok) {
        return await res.json();
      }
      
      return null;
    } catch (err) {
      console.error('Erreur Scryfall:', err);
      return null;
    }
  }, []);

  // Parser la ligne du bas pour extraire set code et collector number
  const parseBottomLine = useCallback((text) => {
    // Format typique: "TDM • 0138 • EN" ou "TDM 0138 EN"
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');
    const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
    
    let setCode = null;
    let collectorNumber = null;
    
    for (const part of parts) {
      // Set code: 3-4 lettres
      if (/^[A-Z]{3,4}$/.test(part) && !setCode) {
        setCode = part;
      }
      // Collector number: chiffres (avec possible leading zeros)
      if (/^\d{1,4}$/.test(part) && !collectorNumber) {
        collectorNumber = part.replace(/^0+/, '') || '0';
      }
    }
    
    return { setCode, collectorNumber };
  }, []);

  // Détecter si l'image a changé significativement
  const hasImageChanged = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Calculer un hash simple de l'image (moyenne des pixels)
    let sum = 0;
    for (let i = 0; i < imageData.data.length; i += 40) { // Échantillonner
      sum += imageData.data[i];
    }
    const hash = Math.floor(sum / (imageData.data.length / 40));
    
    const lastHash = lastFrameDataRef.current;
    lastFrameDataRef.current = hash;
    
    // Si c'est le premier frame ou si le hash a changé significativement
    if (lastHash === null) return false;
    return Math.abs(hash - lastHash) > 10;
  }, []);

  // Fonction principale de scan
  const scanCard = useCallback(async () => {
    if (scanningRef.current || !workerRef.current) return;
    
    scanningRef.current = true;
    setIsScanning(true);
    
    try {
      const canvas = captureFrame();
      if (!canvas) {
        scanningRef.current = false;
        setIsScanning(false);
        return;
      }
      
      // Vérifier si l'image a changé
      if (!hasImageChanged(canvas)) {
        scanningRef.current = false;
        setIsScanning(false);
        return;
      }
      
      const zones = getCardZones(canvas);
      
      // OCR sur le nom
      const nameCanvas = cropZone(canvas, zones.name);
      const nameText = await performOCR(nameCanvas);
      console.log('📝 Nom détecté:', nameText);
      
      // OCR sur la ligne du bas
      const bottomCanvas = cropZone(canvas, zones.bottomLine);
      const bottomText = await performOCR(bottomCanvas);
      console.log('📝 Ligne du bas:', bottomText);
      
      // Parser la ligne du bas
      const { setCode, collectorNumber } = parseBottomLine(bottomText);
      console.log('📦 Set:', setCode, '| #:', collectorNumber);
      
      // Rechercher sur Scryfall
      const card = await searchScryfall(nameText, collectorNumber, setCode);
      
      if (card) {
        // Vérifier si c'est pas un doublon immédiat
        const cardId = `${card.name}-${card.set}-${card.collector_number}`;
        
        if (!recentScans.includes(cardId)) {
          // Ajouter aux scans récents (garder les 5 derniers)
          setRecentScans(prev => [cardId, ...prev.slice(0, 4)]);
          
          // Afficher le feedback
          setLastScannedCard(card);
          setScanCount(prev => prev + 1);
          
          // Callback pour ajouter à la collection
          if (onCardScanned) {
            onCardScanned(card);
          }
          
          // Effacer le feedback après 2 secondes
          setTimeout(() => {
            setLastScannedCard(null);
          }, 2000);
        }
      }
      
    } catch (err) {
      console.error('Erreur scan:', err);
    }
    
    scanningRef.current = false;
    setIsScanning(false);
  }, [captureFrame, cropZone, getCardZones, performOCR, parseBottomLine, searchScryfall, hasImageChanged, recentScans, onCardScanned]);

  // Scanner en continu
  useEffect(() => {
    if (isLoading || error) return;
    
    const interval = setInterval(() => {
      scanCard();
    }, 1500); // Scanner toutes les 1.5 secondes
    
    return () => clearInterval(interval);
  }, [isLoading, error, scanCard]);

  // Réinitialiser les scans récents après 5 secondes (permet de re-scanner)
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentScans([]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#000',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Camera size={24} color="#7c3aed" />
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Scanner de cartes</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
              {scanCount} carte(s) scannée(s)
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#fff'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Zone vidéo */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <Loader size={48} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af' }}>Initialisation de la caméra...</p>
          </div>
        ) : error ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            padding: '32px'
          }}>
            <AlertCircle size={48} color="#ef4444" />
            <p style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {/* Cadre de guidage */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%',
              maxWidth: '300px',
              aspectRatio: '63/88', // Ratio carte MTG
              border: '3px solid rgba(124, 58, 237, 0.8)',
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
            }}>
              {/* Indicateur de scan */}
              {isScanning && (
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'rgba(124, 58, 237, 0.9)',
                  borderRadius: '20px'
                }}>
                  <Zap size={16} color="#fff" />
                  <span style={{ color: '#fff', fontSize: '12px' }}>Scan en cours...</span>
                </div>
              )}
            </div>
            
            {/* Canvas caché pour le traitement */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}
      </div>

      {/* Popup de confirmation */}
      {lastScannedCard && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          backgroundColor: 'rgba(5, 150, 105, 0.95)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <Check size={24} color="#fff" />
          <div>
            <p style={{ margin: 0, color: '#fff', fontWeight: '600' }}>Carte ajoutée !</p>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
              {lastScannedCard.name}
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
          Place une carte dans le cadre pour la scanner automatiquement
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CardScanner;
