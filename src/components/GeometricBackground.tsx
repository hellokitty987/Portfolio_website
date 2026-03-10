import React, { useEffect, useRef } from 'react';

export default function GeometricBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth - 264; // Account for sidebar
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Color interpolation function
    const interpolateColor = (progress: number) => {
      const grey = { r: 156, g: 163, b: 175 };
      const lightRed = { r: 254, g: 202, b: 202 }; // text-red-200 equivalent
      
      const r = Math.round(grey.r + (lightRed.r - grey.r) * progress);
      const g = Math.round(grey.g + (lightRed.g - grey.g) * progress);
      const b = Math.round(grey.b + (lightRed.b - grey.b) * progress);
      
      return { r, g, b };
    };

    const brightenColor = (color: { r: number; g: number; b: number }, amount: number) => ({
      r: Math.min(255, color.r + amount),
      g: Math.min(255, color.g + amount),
      b: Math.min(255, color.b + amount),
    });

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      speed: number;
      angle: number;
      centerDistance: number;

      constructor() {
        this.reset();
        // Initialize at random positions
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }

      reset() {
        // Reduced speed by 30%
        const baseSpeed = (Math.random() * 0.7 + 0.3) * 0.7; // 0.7 represents 30% reduction
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(this.angle) * baseSpeed;
        this.vy = Math.sin(this.angle) * baseSpeed;
        this.size = Math.random() * 2 + 1;
        
        // Calculate distance from center (used for density distribution)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dx = this.x - centerX;
        const dy = this.y - centerY;
        this.centerDistance = Math.sqrt(dx * dx + dy * dy);
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Update center distance
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dx = this.x - centerX;
        const dy = this.y - centerY;
        this.centerDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }

    // Create particles with varying density
    const particles: Particle[] = [];
    const totalParticles = 150; // Increased total particles for better coverage

    for (let i = 0; i < totalParticles; i++) {
      particles.push(new Particle());
    }

    // Animation variables
    let colorProgress = 0;
    let colorDirection = 1;

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update color progress
      colorProgress += 0.005 * colorDirection;
      if (colorProgress >= 1) {
        colorProgress = 1;
        colorDirection = -1;
      } else if (colorProgress <= 0) {
        colorProgress = 0;
        colorDirection = 1;
      }

      const currentColor = interpolateColor(colorProgress);
      const lineColor = brightenColor(currentColor, 18);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
      });

      // Draw connections between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Maximum distance for connection varies based on center distance
          const maxDistance = 120 + (particles[i].centerDistance + particles[j].centerDistance) / 8;

          if (distance < maxDistance) {
            // Opacity based on distance and center position
            const centerFactor = Math.min(
              (particles[i].centerDistance + particles[j].centerDistance) / (canvas.width + canvas.height),
              1
            );
            const opacity = (1 - distance / maxDistance) * 0.42 * (0.55 + centerFactor * 0.45);

            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${lineColor.r}, ${lineColor.g}, ${lineColor.b}, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(particle => {
        const centerFactor = particle.centerDistance / (Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2);
        const opacity = 0.3 + centerFactor * 0.4; // Higher opacity for particles further from center

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ marginLeft: '264px' }}
    />
  );
}
