/**
 * 生成简单的 ICO 图标文件
 * 运行方式: node build/generate-icon.js
 * 
 * 这个脚本生成一个基本的 256x256 ICO 文件
 * 用于 electron-builder 打包
 */

const fs = require('fs');
const path = require('path');

// ICO 文件头结构
function createIcoHeader(imageCount) {
  const buffer = Buffer.alloc(6);
  buffer.writeUInt16LE(0, 0);      // 保留字段，必须为 0
  buffer.writeUInt16LE(1, 2);      // 图像类型：1 = ICO
  buffer.writeUInt16LE(imageCount, 4); // 图像数量
  return buffer;
}

// ICO 目录条目
function createIcoEntry(width, height, bpp, dataSize, dataOffset) {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt8(width === 256 ? 0 : width, 0);   // 宽度（256 用 0 表示）
  buffer.writeUInt8(height === 256 ? 0 : height, 1); // 高度（256 用 0 表示）
  buffer.writeUInt8(0, 2);         // 调色板颜色数（0 = 无调色板）
  buffer.writeUInt8(0, 3);         // 保留字段
  buffer.writeUInt16LE(1, 4);      // 颜色平面数
  buffer.writeUInt16LE(bpp, 6);    // 每像素位数
  buffer.writeUInt32LE(dataSize, 8);   // 图像数据大小
  buffer.writeUInt32LE(dataOffset, 12); // 图像数据偏移
  return buffer;
}

// 创建 BMP 格式的图像数据（不含文件头）
function createBmpData(width, height) {
  const bpp = 32; // 32 位色深（BGRA）
  const rowSize = width * 4;
  const pixelDataSize = rowSize * height;
  
  // BMP 信息头（BITMAPINFOHEADER）
  const infoHeader = Buffer.alloc(40);
  infoHeader.writeUInt32LE(40, 0);        // 信息头大小
  infoHeader.writeInt32LE(width, 4);      // 宽度
  infoHeader.writeInt32LE(height * 2, 8); // 高度（ICO 中需要 *2，包含掩码）
  infoHeader.writeUInt16LE(1, 12);        // 颜色平面数
  infoHeader.writeUInt16LE(bpp, 14);      // 每像素位数
  infoHeader.writeUInt32LE(0, 16);        // 压缩方式（0 = 不压缩）
  infoHeader.writeUInt32LE(pixelDataSize, 20); // 图像数据大小
  infoHeader.writeInt32LE(0, 24);         // 水平分辨率
  infoHeader.writeInt32LE(0, 28);         // 垂直分辨率
  infoHeader.writeUInt32LE(0, 32);        // 调色板颜色数
  infoHeader.writeUInt32LE(0, 36);        // 重要颜色数
  
  // 像素数据（BGRA 格式，从下到上）
  const pixelData = Buffer.alloc(pixelDataSize);
  
  // 绘制渐变背景和简单图案
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const realY = height - 1 - y; // BMP 从下到上存储
      
      // 计算到中心的距离
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = realY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      
      // 圆角矩形边界
      const margin = width * 0.0625; // 16/256
      const cornerRadius = width * 0.1875; // 48/256
      
      let inRect = false;
      if (x >= margin && x < width - margin && realY >= margin && realY < height - margin) {
        // 检查圆角
        const innerX = x - margin;
        const innerY = realY - margin;
        const innerW = width - 2 * margin;
        const innerH = height - 2 * margin;
        
        if (innerX < cornerRadius && innerY < cornerRadius) {
          // 左下角
          const cdx = innerX - cornerRadius;
          const cdy = innerY - cornerRadius;
          inRect = Math.sqrt(cdx * cdx + cdy * cdy) <= cornerRadius;
        } else if (innerX >= innerW - cornerRadius && innerY < cornerRadius) {
          // 右下角
          const cdx = innerX - (innerW - cornerRadius);
          const cdy = innerY - cornerRadius;
          inRect = Math.sqrt(cdx * cdx + cdy * cdy) <= cornerRadius;
        } else if (innerX < cornerRadius && innerY >= innerH - cornerRadius) {
          // 左上角
          const cdx = innerX - cornerRadius;
          const cdy = innerY - (innerH - cornerRadius);
          inRect = Math.sqrt(cdx * cdx + cdy * cdy) <= cornerRadius;
        } else if (innerX >= innerW - cornerRadius && innerY >= innerH - cornerRadius) {
          // 右上角
          const cdx = innerX - (innerW - cornerRadius);
          const cdy = innerY - (innerH - cornerRadius);
          inRect = Math.sqrt(cdx * cdx + cdy * cdy) <= cornerRadius;
        } else {
          inRect = true;
        }
      }
      
      if (inRect) {
        // 渐变背景：从蓝色 (#4285F4) 到绿色 (#34A853)
        const t = (x + realY) / (width + height);
        const r = Math.round(0x42 + (0x34 - 0x42) * t);
        const g = Math.round(0x85 + (0xA8 - 0x85) * t);
        const b = Math.round(0xF4 + (0x53 - 0xF4) * t);
        
        // 聊天气泡区域
        const bubbleLeft = width * 0.25;
        const bubbleRight = width * 0.75;
        const bubbleTop = height * 0.34;
        const bubbleBottom = height * 0.66;
        const bubbleRadius = width * 0.0625;
        
        let inBubble = false;
        if (x >= bubbleLeft && x <= bubbleRight && realY >= bubbleTop && realY <= bubbleBottom) {
          inBubble = true;
        }
        
        // 两个圆点（Gemini 标志）
        const dot1X = width * 0.42;
        const dot2X = width * 0.58;
        const dotY = height * 0.53;
        const dotRadius = width * 0.047;
        
        const dist1 = Math.sqrt((x - dot1X) ** 2 + (realY - dotY) ** 2);
        const dist2 = Math.sqrt((x - dot2X) ** 2 + (realY - dotY) ** 2);
        
        if (dist1 <= dotRadius) {
          // 蓝色圆点
          pixelData[idx] = 0xF4;     // B
          pixelData[idx + 1] = 0x85; // G
          pixelData[idx + 2] = 0x42; // R
          pixelData[idx + 3] = 255;  // A
        } else if (dist2 <= dotRadius) {
          // 绿色圆点
          pixelData[idx] = 0x53;     // B
          pixelData[idx + 1] = 0xA8; // G
          pixelData[idx + 2] = 0x34; // R
          pixelData[idx + 3] = 255;  // A
        } else if (inBubble) {
          // 白色气泡
          pixelData[idx] = 255;      // B
          pixelData[idx + 1] = 255;  // G
          pixelData[idx + 2] = 255;  // R
          pixelData[idx + 3] = 242;  // A (略微透明)
        } else {
          // 渐变背景
          pixelData[idx] = b;        // B
          pixelData[idx + 1] = g;    // G
          pixelData[idx + 2] = r;    // R
          pixelData[idx + 3] = 255;  // A
        }
      } else {
        // 透明区域
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 0;
      }
    }
  }
  
  // AND 掩码（透明度掩码，每像素 1 位）
  const maskRowSize = Math.ceil(width / 8);
  const maskPadding = (4 - (maskRowSize % 4)) % 4;
  const maskSize = (maskRowSize + maskPadding) * height;
  const maskData = Buffer.alloc(maskSize, 0); // 全 0 表示不透明
  
  return Buffer.concat([infoHeader, pixelData, maskData]);
}

// 生成 ICO 文件
function generateIco(outputPath) {
  const width = 256;
  const height = 256;
  const bpp = 32;
  
  const header = createIcoHeader(1);
  const bmpData = createBmpData(width, height);
  const entry = createIcoEntry(width, height, bpp, bmpData.length, 6 + 16);
  
  const icoBuffer = Buffer.concat([header, entry, bmpData]);
  
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`图标已生成: ${outputPath}`);
  console.log(`文件大小: ${icoBuffer.length} 字节`);
}

// 执行
const outputPath = path.join(__dirname, 'icon.ico');
generateIco(outputPath);
