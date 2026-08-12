import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import JSZip from 'jszip';

const DownloadButton = ({ examRef, size, className }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const url = localStorage.getItem("API") ;
  const token = localStorage.getItem('token');

  const downloadZipFile = async (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleDirectDownload = async () => {
    const response = await fetch(`${url}/getfile/${examRef}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    await downloadZipFile(blob, `exam_files_${examRef}.zip`);
  };

  const handleIndividualFilesDownload = async () => {
    const filesResponse = await fetch(`${url}/getfile/${examRef}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!filesResponse.ok) {
      throw new Error(`HTTP error! status: ${filesResponse.status}`);
    }

    const files = await filesResponse.json();
    
    if (!files || files.length === 0) {
      throw new Error('ไม่พบไฟล์ที่ต้องการดาวน์โหลด');
    }

    const zip = new JSZip();
    
    // ดาวน์โหลดแต่ละไฟล์และเพิ่มเข้า ZIP
    const downloadPromises = files.map(async (file, index) => {
      const fileResponse = await fetch(`${url}/getfile/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!fileResponse.ok) {
        throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ ${file.name || `exam_${index + 1}`} ได้`);
      }
      
      const fileBlob = await fileResponse.blob();
      zip.file(file.name || `exam_${index + 1}.pdf`, fileBlob);
    });

    await Promise.all(downloadPromises);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    await downloadZipFile(zipBlob, `exam_files_${examRef}.zip`);
  };

  const handleDownload = async () => {
    if (!examRef) return;
    
    try {
      setIsDownloading(true);
      
      // ลองดาวน์โหลดแบบที่ 1 ก่อน ถ้าไม่สำเร็จจะใช้แบบที่ 2
      try {
        await handleDirectDownload();
      } catch (directError) {
        console.log('Direct download failed, trying individual files download');
        await handleIndividualFilesDownload();
      }
    } catch (error) {
      console.error('Download error:', error);
      // แสดง alert เฉพาะกรณีที่มีข้อความ error ที่ต้องการแสดงให้ user เห็น
      if (error.message.includes('ไม่พบไฟล์') || error.message.includes('ไม่สามารถดาวน์โหลดไฟล์')) {
        alert(error.message);
      } else {
        alert('ไม่พบไฟล์ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant="success"
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={isDownloading || !examRef}
      style={
        size
          ? undefined
          : {
              width: '160px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              height: '45px',
              marginRight: '10px'
            }
      }
    >
      {isDownloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดไฟล์'}
    </Button>
  );
};

export default DownloadButton;