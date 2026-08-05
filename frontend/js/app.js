const App = {
  init() {
    console.log("Initializing CivicIntel Application System...");
    
    // Initialize Auth Session
    Auth.init();

    // Attach Dropzone Drag & Drop events
    this.setupDropzone();
  },

  showView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }
  },

  setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        dropzone.style.borderColor = 'var(--accent-primary)';
        dropzone.style.background = 'rgba(99, 102, 241, 0.15)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.background = 'rgba(0, 0, 0, 0.25)';
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files && files.length > 0) {
        document.getElementById('fileInput').files = files;
        Citizen.handleFileSelect({ target: { files: files } });
      }
    }, false);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
