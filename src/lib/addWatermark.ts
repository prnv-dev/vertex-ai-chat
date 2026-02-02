/**
 * Adds a VertexAI logo watermark to a base64 image
 * Position: Bottom-right corner with transparent background
 */
export async function addVertexAIWatermark(imageBase64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageBase64);
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Calculate logo size based on image dimensions (7% of image width)
        const logoSize = Math.max(60, Math.min(120, img.width * 0.07));
        const padding = logoSize * 0.35;
        
        // Position: bottom-right corner, shifted slightly left
        const leftOffset = logoSize * 0.5;
        const x = img.width - logoSize - padding - leftOffset;
        const y = img.height - logoSize - padding;
        
        // Save context for transformations
        ctx.save();
        ctx.translate(x, y);
        
        // Scale factor for the logo (original SVG is 100x100)
        const scale = logoSize / 100;
        ctx.scale(scale, scale);
        
        // Add subtle drop shadow for the entire logo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw rounded square background (like VertexAIIcon)
        const bgGrad = ctx.createLinearGradient(0, 0, 100, 100);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e3a5f');
        bgGrad.addColorStop(1, '#0f172a');
        
        ctx.beginPath();
        ctx.roundRect(0, 0, 100, 100, 22);
        ctx.fillStyle = bgGrad;
        ctx.fill();
        
        // Reset shadow for inner elements
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Create gradients for the V logo
        const vGrad = ctx.createLinearGradient(0, 0, 100, 100);
        vGrad.addColorStop(0, '#3b82f6');
        vGrad.addColorStop(0.5, '#06b6d4');
        vGrad.addColorStop(1, '#3b82f6');
        
        const nodeGrad = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
        nodeGrad.addColorStop(0, '#06b6d4');
        nodeGrad.addColorStop(1, '#3b82f6');
        
        // Draw neural network connection lines (subtle)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(32, 28);
        ctx.lineTo(50, 72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(68, 28);
        ctx.lineTo(50, 72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(38, 42);
        ctx.lineTo(62, 42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(42, 54);
        ctx.lineTo(58, 54);
        ctx.stroke();
        
        // Draw main V shape - left arm
        ctx.strokeStyle = vGrad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(24, 22);
        ctx.lineTo(50, 78);
        ctx.stroke();
        
        // Draw main V shape - right arm
        ctx.beginPath();
        ctx.moveTo(76, 22);
        ctx.lineTo(50, 78);
        ctx.stroke();
        
        // Add glow effect for nodes
        ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw vertex nodes
        ctx.fillStyle = nodeGrad;
        
        // Top left node
        ctx.beginPath();
        ctx.arc(24, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Top right node
        ctx.beginPath();
        ctx.arc(76, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom vertex node (larger)
        ctx.beginPath();
        ctx.arc(50, 78, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Smaller intermediate nodes
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#3b82f6';
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        ctx.arc(36, 40, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(64, 40, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#06b6d4';
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        ctx.arc(43, 55, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(57, 55, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Convert to base64 with maximum quality
        const watermarkedImage = canvas.toDataURL('image/png', 1.0);
        resolve(watermarkedImage);
      } catch (error) {
        console.error('Failed to add watermark:', error);
        resolve(imageBase64);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image for watermarking');
      resolve(imageBase64);
    };
    
    img.src = imageBase64;
  });
}
