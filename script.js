// ============================
// DOM 요소 참조
// ============================

const elTodayDate = document.getElementById('today-date');
const elDatamatrix = document.getElementById('datamatrix');
const elProductName = document.getElementById('product-name');
const elInspector = document.getElementById('inspector');
const elNote = document.getElementById('note');

const elPreviewFront = document.getElementById('preview-front');
const elPreviewBack = document.getElementById('preview-back');
const elPreviewSide = document.getElementById('preview-side');

const elFileFrontCamera = document.getElementById('file-front-camera');
const elFileFrontGallery = document.getElementById('file-front-gallery');
const elFileBackCamera = document.getElementById('file-back-camera');
const elFileBackGallery = document.getElementById('file-back-gallery');
const elFileSideCamera = document.getElementById('file-side-camera');
const elFileSideGallery = document.getElementById('file-side-gallery');

const elBtnSave = document.getElementById('btn-save');
const elBtnScan = document.getElementById('btn-scan');

const elToastContainer = document.getElementById('toast-container');
const elLoadingOverlay = document.getElementById('loading-overlay');

// 이미지 파일을 메모리에 보관
const imageFiles = {
  front: null,
  back: null,
  side: null,
};

// ============================
// 유틸 함수
// ============================

function formatToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(message, type = 'success') {
  if (!elToastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const dot = document.createElement('div');
  dot.className = 'toast-dot';
  const text = document.createElement('div');
  text.textContent = message;

  toast.appendChild(dot);
  toast.appendChild(text);
  elToastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(4px)';
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 2600);
}

function setLoading(isLoading) {
  if (!elLoadingOverlay || !elBtnSave) return;
  if (isLoading) {
    elLoadingOverlay.classList.remove('hidden');
    elBtnSave.disabled = true;
  } else {
    elLoadingOverlay.classList.add('hidden');
    elBtnSave.disabled = false;
  }
}

// ============================
// 이미지 선택 / 미리보기
// ============================

/**
 * 특정 input에서 이미지를 선택했을 때 미리보기를 갱신하고
 * imageFiles 객체에 파일을 저장.
 */
function handleImageChange(side, fileInput, previewEl) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    imageFiles[side] = null;
    if (previewEl) {
      previewEl.src = '';
      previewEl.classList.remove('has-image');
    }
    return;
  }

  imageFiles[side] = file;
  const url = URL.createObjectURL(file);
  previewEl.src = url;
  previewEl.classList.add('has-image');
}

function bindImageInputs() {
  if (elFileFrontCamera) {
    elFileFrontCamera.addEventListener('change', () =>
      handleImageChange('front', elFileFrontCamera, elPreviewFront)
    );
  }
  if (elFileFrontGallery) {
    elFileFrontGallery.addEventListener('change', () =>
      handleImageChange('front', elFileFrontGallery, elPreviewFront)
    );
  }
  if (elFileBackCamera) {
    elFileBackCamera.addEventListener('change', () =>
      handleImageChange('back', elFileBackCamera, elPreviewBack)
    );
  }
  if (elFileBackGallery) {
    elFileBackGallery.addEventListener('change', () =>
      handleImageChange('back', elFileBackGallery, elPreviewBack)
    );
  }
  if (elFileSideCamera) {
    elFileSideCamera.addEventListener('change', () =>
      handleImageChange('side', elFileSideCamera, elPreviewSide)
    );
  }
  if (elFileSideGallery) {
    elFileSideGallery.addEventListener('change', () =>
      handleImageChange('side', elFileSideGallery, elPreviewSide)
    );
  }

  // 버튼 클릭 시 숨겨진 file input 트리거
  document.querySelectorAll('.image-actions .btn').forEach((btn) => {
    const target = btn.getAttribute('data-target');
    if (!target) return;
    btn.addEventListener('click', () => {
      const input = document.getElementById(`file-${target}`);
      if (input) {
        input.click();
      }
    });
  });
}

// ============================
// 입력값 처리 및 검증
// ============================

function bindDatamatrixBehavior() {
  if (!elDatamatrix || !elProductName) return;

  // 데이터메트릭스 입력 후 포커스 아웃 시 제품명 자동 채움 (비어 있을 때만)
  elDatamatrix.addEventListener('blur', () => {
    if (!elProductName.value && elDatamatrix.value) {
      elProductName.value = elDatamatrix.value;
    }
  });

  // 스캔 버튼: 단순히 데이터메트릭스 값을 제품명으로 복사
  if (elBtnScan) {
    elBtnScan.addEventListener('click', () => {
      if (elDatamatrix.value) {
        elProductName.value = elDatamatrix.value;
        showToast('데이터메트릭스를 제품명에 적용했습니다.', 'success');
      } else {
        showToast('먼저 데이터메트릭스 값을 입력하세요.', 'error');
      }
    });
  }
}

function validateForm() {
  const productName = elProductName?.value.trim() || '';
  const inspector = elInspector?.value.trim() || '';

  if (!productName) {
    showToast('제품명을 입력하세요.', 'error');
    return false;
  }
  if (!inspector) {
    showToast('검사자를 입력하세요.', 'error');
    return false;
  }
  return true;
}

function resetForm() {
  if (elDatamatrix) elDatamatrix.value = '';
  if (elProductName) elProductName.value = '';
  if (elInspector) elInspector.value = '';
  if (elNote) elNote.value = '';

  imageFiles.front = null;
  imageFiles.back = null;
  imageFiles.side = null;

  [elPreviewFront, elPreviewBack, elPreviewSide].forEach((preview) => {
    if (preview) {
      preview.src = '';
      preview.classList.remove('has-image');
    }
  });
}

// ============================
// SharePoint 백엔드로 저장 호출
// ============================

/**
 * 텍스트 + 이미지 모두를 FormData로 만들어
 * 우리 백엔드(`/api/inspection`) 로 전송.
 * 백엔드는 SharePoint(List45 + 문서 라이브러리)에 실제 저장을 수행.
 */
async function saveInspection() {
  if (!validateForm()) return;

  const productName = elProductName.value.trim();
  const inspector = elInspector.value.trim();
  const note = elNote?.value.trim() || '';
  const datamatrixValue = elDatamatrix?.value.trim() || '';

  setLoading(true);

  try {
    const formData = new FormData();
    formData.append('productName', productName);
    formData.append('inspector', inspector);
    formData.append('note', note);
    formData.append('datamatrix', datamatrixValue);

    if (imageFiles.front) {
      formData.append('front', imageFiles.front);
    }
    if (imageFiles.back) {
      formData.append('back', imageFiles.back);
    }
    if (imageFiles.side) {
      formData.append('side', imageFiles.side);
    }

    // TODO: 백엔드 실제 주소로 변경 (예: http://localhost:4000)
    const response = await fetch('http://localhost:4000/api/inspection', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('SharePoint 저장 실패', response.status);
      showToast('저장 중 오류가 발생했습니다. 서버 로그를 확인하세요.', 'error');
      return;
    }

    // 필요하면 응답 데이터 활용
    // const data = await response.json();

    resetForm();
    showToast('저장 완료', 'success');
  } catch (err) {
    console.error('[저장 오류]', err);
    showToast('저장 중 오류가 발생했습니다. 네트워크를 확인하세요.', 'error');
  } finally {
    setLoading(false);
  }
}

// ============================
// 초기 바인딩
// ============================

function init() {
  if (elTodayDate) {
    elTodayDate.textContent = formatToday();
  }

  bindImageInputs();
  bindDatamatrixBehavior();

  if (elBtnSave) {
    elBtnSave.addEventListener('click', () => {
      saveInspection();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);