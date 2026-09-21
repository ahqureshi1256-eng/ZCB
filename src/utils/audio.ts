// Client-side Web Audio API sounds for POS bill printing and item adding

class SoundManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playAddItem() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // Audio context might be blocked by browser policy until interaction
    }
  }

  playPrintBill() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Cash register bell + print chatter chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.08); // E6
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch {
      // Ignored
    }
  }

  playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Ignored
    }
  }

  private bellIntervalId: any = null;

  // Speak voice alert: "اے مزمل! آرڈر اٹھاؤ! نیا آن لائن آرڈر آیا ہے!"
  speakVoiceAlert(cashierName: string = 'مزمل') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      // Normalize cashier name (default 'مزمل' / 'Muzammil')
      const name = (cashierName || 'مزمل').trim();
      const voices = window.speechSynthesis.getVoices();

      // Look for Urdu or Hindi voice
      const urduOrHindiVoice = voices.find(
        (v) =>
          v.lang.startsWith('ur') ||
          v.lang.startsWith('hi') ||
          v.name.toLowerCase().includes('urdu') ||
          v.name.toLowerCase().includes('hindi')
      );

      let textToSpeak = '';
      let lang = 'en-US';

      if (urduOrHindiVoice) {
        // Native Urdu / Hindi voice detected
        textToSpeak = `اے ${name}، آرڈر اٹھاؤ! نیا آن لائن آرڈر آیا ہے!`;
        lang = urduOrHindiVoice.lang;
      } else {
        // English / Universal device voice reading clear Roman Urdu phonetics
        textToSpeak = `Ae ${name}! Order uthao! Naya online order aaya hai!`;
        lang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (urduOrHindiVoice) {
        utterance.voice = urduOrHindiVoice;
      }
      utterance.lang = lang;
      utterance.rate = 0.95; // Crisp, clear pace for busy kitchen / counter
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis alert error:', e);
    }
  }

  // Authentic Loud Restaurant Order Ringing Bell (Ding! Ding! Ding! + Kitchen Buzzer)
  playOrderBell() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Authentic brass counter service bell / restaurant chime with harmonics
      const freqs = [1568, 2093, 3136]; // G6, C7, G7 harmonics
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        const vol = idx === 0 ? 0.6 : idx === 1 ? 0.45 : 0.3;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });

      // Secondary quick harmonic chime 140ms later ("Ding-Ding")
      setTimeout(() => {
        if (!this.ctx) return;
        const t2 = this.ctx.currentTime;
        const chimeFreqs = [1760, 2349, 3520]; // A6, D7, A7
        chimeFreqs.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t2);
          
          const vol = idx === 0 ? 0.55 : 0.35;
          gain.gain.setValueAtTime(vol, t2);
          gain.gain.exponentialRampToValueAtTime(0.0001, t2 + 1.1);
          
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t2);
          osc.stop(t2 + 1.1);
        });
      }, 140);

      // Third strike 300ms later for urgent notification ("Tring-Tring-Tring!")
      setTimeout(() => {
        if (!this.ctx) return;
        const t3 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2637, t3); // E7
        gain.gain.setValueAtTime(0.4, t3);
        gain.gain.exponentialRampToValueAtTime(0.0001, t3 + 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t3);
        osc.stop(t3 + 0.9);
      }, 300);
    } catch (err) {
      console.warn('Audio error', err);
    }
  }

  // Start continuous ringing order bell + talking voice alert until cashier accepts the order!
  // repeatTimes <= 0 means INFINITE continuous ringing until cashier explicitly lifts/accepts the order!
  startContinuousOrderBell(repeatTimes: number = 0, cashierName: string = 'مزمل', enableVoice: boolean = true) {
    this.stopContinuousOrderBell();
    
    // First trigger immediately
    this.playOrderBell();
    if (enableVoice) {
      setTimeout(() => {
        this.speakVoiceAlert(cashierName);
      }, 250);
    }

    let count = 1;
    this.bellIntervalId = setInterval(() => {
      this.playOrderBell();
      if (enableVoice) {
        setTimeout(() => {
          this.speakVoiceAlert(cashierName);
        }, 250);
      }
      count++;
      // If repeatTimes > 0, stop at limit; if repeatTimes === 0, keep ringing FOREVER until cashier presses "آرڈر اٹھائیں"!
      if (repeatTimes > 0 && count >= repeatTimes) {
        this.stopContinuousOrderBell();
      }
    }, 3200); // Continuous ringing & call alert every 3.2s
  }

  // 1-Click test method for owner / cashier
  testVoiceAlert(cashierName: string = 'مزمل') {
    this.stopContinuousOrderBell();
    this.playOrderBell();
    setTimeout(() => {
      this.speakVoiceAlert(cashierName);
    }, 250);
  }

  stopContinuousOrderBell() {
    if (this.bellIntervalId) {
      clearInterval(this.bellIntervalId);
      this.bellIntervalId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}

export const posSound = new SoundManager();
