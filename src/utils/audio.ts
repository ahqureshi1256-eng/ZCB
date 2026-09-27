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

      this.playThermalPrinterMotor();
    } catch {
      // Ignored
    }
  }

  // Realistic POS Thermal Printer Stepper Motor & Paper Feeding sound
  playThermalPrinterMotor() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Noise buffer for paper feed friction
      const bufferSize = this.ctx.sampleRate * 0.8; // 800ms print motor run
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.8);

      // Fast stepper motor click ticks
      for (let step = 0; step < 8; step++) {
        const stepTime = now + step * 0.09;
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'square';
        tickOsc.frequency.setValueAtTime(440 + step * 20, stepTime);
        tickGain.gain.setValueAtTime(0.04, stepTime);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, stepTime + 0.03);
        tickOsc.connect(tickGain);
        tickGain.connect(this.ctx.destination);
        tickOsc.start(stepTime);
        tickOsc.stop(stepTime + 0.03);
      }
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

  playSuccess() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignored
    }
  }

  private bellIntervalId: any = null;
  private ringingListeners: Set<(isRinging: boolean) => void> = new Set();

  addRingingListener(listener: (isRinging: boolean) => void) {
    this.ringingListeners.add(listener);
    listener(this.isRinging());
    return () => {
      this.ringingListeners.delete(listener);
    };
  }

  private notifyRingingState(ringing: boolean) {
    this.ringingListeners.forEach((listener) => {
      try {
        listener(ringing);
      } catch (err) {
        console.warn('Error in ringing listener', err);
      }
    });
  }

  isRinging(): boolean {
    return this.bellIntervalId !== null;
  }

  // Speak voice alert: "Attention Muzammil! Please lift order! New online order received!"
  speakVoiceAlert(cashierName: string = 'Muzammil') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      // Normalize cashier name (default 'Muzammil')
      const name = (cashierName || 'Muzammil').trim();
      const voices = window.speechSynthesis.getVoices();

      const textToSpeak = `Attention ${name}! Please lift order! New online order received!`;
      const lang = 'en-US';

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
  startContinuousOrderBell(repeatTimes: number = 0, cashierName: string = 'Muzammil', enableVoice: boolean = true) {
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
      if (enableVoice && count % 2 === 0) {
        setTimeout(() => {
          this.speakVoiceAlert(cashierName);
        }, 300);
      }
      count++;
      // If repeatTimes > 0, stop at limit; if repeatTimes === 0, keep ringing FOREVER until cashier clicks "LIFT ORDER"!
      if (repeatTimes > 0 && count >= repeatTimes) {
        this.stopContinuousOrderBell();
      }
    }, 2800); // Continuous ringing & buzzer alert every 2.8s
    this.notifyRingingState(true);
  }

  // Voice confirmation when cashier lifts/accepts order
  speakOrderAccepted(cashierName: string = 'Muzammil') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = `Thank you ${cashierName || 'Muzammil'}! The order has been accepted.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }

  // Continuous bell testing for owner / cashier until stopped
  testVoiceAlert(cashierName: string = 'Muzammil') {
    this.startContinuousOrderBell(0, cashierName, true);
  }

  stopContinuousOrderBell() {
    const wasRinging = this.bellIntervalId !== null;
    if (this.bellIntervalId) {
      clearInterval(this.bellIntervalId);
      this.bellIntervalId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (wasRinging) {
      this.notifyRingingState(false);
    }
  }

  // Playful sizzle & bouncy spring wobble sound when Biryani plate is tapped/clicked
  playBiryaniWobble() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Sizzle noise burst (warm hot biryani dum steam sizzle)
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Playful spring wobble thud (pitch bends down & up like jelly wobble)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

      oscGain.gain.setValueAtTime(0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio context might be restricted before gesture
    }
  }
}

export const posSound = new SoundManager();
