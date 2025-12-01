// constants/sweetAlertConfig.js
export const SWAL_CONFIG = {
    confirmDelete: {
      title: 'ยืนยันการลบ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d63031',
      cancelButtonColor: '#2d3436',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary me-3',
        popup: 'rounded-3',
      },
      buttonsStyling: false
    },
    success: {
      title: 'สำเร็จ!',
      icon: 'success',
     
      customClass: {
        popup: 'rounded-3'
      }
    },
    error: {
      title: 'เกิดข้อผิดพลาด!',
      icon: 'error',
      customClass: {
        popup: 'rounded-3'
      }
    }
  };