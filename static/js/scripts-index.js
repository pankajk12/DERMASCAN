const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', function() {
    const yearElements = document.querySelectorAll('#current-year');
    yearElements.forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    setupParticles();

    const uploadcard = document.getElementById('uploadcard');
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const analyzeBtn = document.getElementById('analyze-btn');
    const changeImageBtn = document.getElementById('change-image-btn');
    const resultsCard = document.getElementById('results-card');
    const resultImg = document.getElementById('result-img');
    const resultCondition = document.getElementById('result-condition');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceText = document.getElementById('confidence-text');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');
    const reportBtn = document.getElementById('report-btn');
    const tipsSection = document.getElementById('tips-section');
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.querySelector('.nav-links');

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    menuIcon.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    uploadContainer.addEventListener('click', () => {
        fileInput.click();
    });

    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.classList.add('dragging');
    });

    uploadContainer.addEventListener('dragleave', () => {
        uploadContainer.classList.remove('dragging');
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        validateAndHandleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        validateAndHandleFile(file);
    });

    function validateAndHandleFile(file) {
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            errorMessage.style.display = 'flex';
            errorText.textContent = 'Please upload a JPG, PNG, or WEBP image.';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            errorMessage.style.display = 'flex';
            errorText.textContent = 'File size exceeds 10MB limit.';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.crossOrigin = 'Anonymous'; // Set early to avoid CORS issues
            uploadContainer.style.display = 'none';
            imagePreview.style.display = 'block';
            errorMessage.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!previewImg.src) {
            errorMessage.style.display = 'flex';
            errorText.textContent = 'No image selected.';
            return;
        }

        scanningOverlay.style.display = 'flex';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: previewImg.src
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (!data.condition || typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
                throw new Error('Invalid response data: condition or confidence is missing or invalid');
            }

            resultImg.src = previewImg.src;
            resultImg.crossOrigin = 'Anonymous'; // Ensure CORS setting
            resultCondition.textContent = data.condition;
            const confidencePercent = Math.round(data.confidence * 100);
            confidenceFill.style.width = `${confidencePercent}%`;
            confidenceText.textContent = `${confidencePercent}% confidence`;

            scanningOverlay.style.display = 'none';
            imagePreview.style.display = 'none';
            uploadcard.style.display = 'none';
            tipsSection.style.display = 'none';
            resultsCard.style.display = 'grid';
            resultsCard.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error analyzing image:', error);
            scanningOverlay.style.display = 'none';
            imagePreview.style.display = 'block';
            errorMessage.style.display = 'flex';
            errorText.textContent = error.message || 'Failed to connect to the analysis server. Please try again.';
        }
    });

    changeImageBtn.addEventListener('click', resetAnalysis);
    newAnalysisBtn.addEventListener('click', resetAnalysis);

    function resetAnalysis() {
        previewImg.src = '';
        previewImg.removeAttribute('src');
        fileInput.value = '';
        uploadContainer.style.display = 'block';
        imagePreview.style.display = 'none';
        resultsCard.style.display = 'none';
        uploadcard.style.display = 'block';
        tipsSection.style.display = 'block';
        errorMessage.style.display = 'none';
        document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
    }

    reportBtn.addEventListener('click', async () => {
        try {
            // Ensure html2canvas is loaded
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library is not loaded.');
            }

            // Ensure the results card is visible
            const element = document.getElementById('results-card');
            if (!element || element.style.display === 'none') {
                throw new Error('Results card is not visible. Please analyze an image first.');
            }

            // Ensure the image element exists
            const resultImage = document.getElementById('result-img');
            if (!resultImage) {
                throw new Error('Result image element not found.');
            }

            // Create a new image element to test CORS and load the image
            const testImage = new Image();
            testImage.crossOrigin = 'Anonymous';
            testImage.src = resultImage.src;

            // Wait for the image to load or fail
            await new Promise((resolve, reject) => {
                testImage.onload = () => {
                    console.log('Image loaded successfully for report generation.');
                    resolve();
                };
                testImage.onerror = () => {
                    reject(new Error('Failed to load the image due to CORS restrictions or invalid source. Please ensure the image is hosted on a server that allows cross-origin access, or upload a different image.'));
                };
            });

            // Create a temporary container for the report
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.top = '-9999px';
            tempContainer.style.left = '-9999px';
            tempContainer.style.backgroundColor = '#000000'; // Match the page background
            tempContainer.style.padding = '30px'; // Consistent padding
            tempContainer.style.width = '800px'; // Fixed width for consistency
            tempContainer.style.height = '400px'; // Adjusted height for better fit
            tempContainer.style.display = 'grid';
            tempContainer.style.gridTemplateColumns = '1fr 1fr'; // Two columns
            tempContainer.style.gridTemplateRows = 'auto 1fr'; // Two rows
            tempContainer.style.gap = '15px'; // Consistent gap

            // Create the logo section (top-left)
            const logoContainer = document.createElement('div');
            logoContainer.style.gridColumn = '1 / 2';
            logoContainer.style.gridRow = '1 / 2';
            logoContainer.style.display = 'flex';
            logoContainer.style.alignItems = 'center';
            logoContainer.style.background = 'linear-gradient(90deg, #8b5cf6, #06b6d4)';
            logoContainer.style.borderRadius = '12px'; // Add curve to the background
            logoContainer.style.padding = '10px'; // Add padding for better spacing
            const logoText = document.createElement('h1');
            logoText.textContent = 'DermaScan';
            logoText.style.fontSize = '48px';
            logoText.style.fontWeight = 'bold';
            logoText.style.webkitBackgroundClip = 'text';
            logoText.style.backgroundClip = 'text';
            logoText.style.webkitTextFillColor = 'transparent';
            logoText.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            logoContainer.appendChild(logoText);
            tempContainer.appendChild(logoContainer);

            // Create the image section (bottom-left)
            const imageContainer = document.createElement('div');
            imageContainer.style.gridColumn = '1 / 2';
            imageContainer.style.gridRow = '2 / 3';
            imageContainer.style.position = 'relative';
            imageContainer.style.height = '250px'; // Consistent height
            const clonedImg = document.createElement('img');
            clonedImg.crossOrigin = 'Anonymous';
            clonedImg.src = resultImage.src;
            clonedImg.style.width = '100%';
            clonedImg.style.height = '100%';
            clonedImg.style.objectFit = 'cover';
            clonedImg.style.borderRadius = '8px';
            clonedImg.style.border = '1px solid #27272a'; // Match --border
            imageContainer.appendChild(clonedImg);

            // Add the gradient overlay to the image
            const clonedOverlay = document.createElement('div');
            clonedOverlay.style.position = 'absolute';
            clonedOverlay.style.bottom = '0';
            clonedOverlay.style.left = '0';
            clonedOverlay.style.right = '0';
            clonedOverlay.style.height = '50%';
            clonedOverlay.style.background = 'linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent)';
            imageContainer.appendChild(clonedOverlay);
            tempContainer.appendChild(imageContainer);

            // Clone the results content (right side, spanning both rows)
            const clonedResultsContent = element.querySelector('.results-content').cloneNode(true);
            clonedResultsContent.style.gridColumn = '2 / 3';
            clonedResultsContent.style.gridRow = '1 / 3';
            clonedResultsContent.style.padding = '20px'; // Consistent padding

            // Remove the preview-actions section (buttons) from the cloned results content
            const previewActions = clonedResultsContent.querySelector('.preview-actions');
            if (previewActions) {
                previewActions.remove();
            }

            tempContainer.appendChild(clonedResultsContent);

            // Apply card styling to the entire grid
            tempContainer.style.backgroundColor = 'rgba(24, 24, 27, 0.5)'; // Match --card-bg
            tempContainer.style.border = '2px solid #8b5cf6'; // Match --border
            tempContainer.style.borderRadius = '12px';

            // Adjust font sizes and margins in results-content
            const resultsHeader = clonedResultsContent.querySelector('.results-header');
            if (resultsHeader) {
                const headerH3 = resultsHeader.querySelector('h3');
                if (headerH3) {
                    headerH3.style.fontSize = '20px'; // Consistent font size
                }
                resultsHeader.style.marginBottom = '16px';
            }

            const resultItems = clonedResultsContent.querySelectorAll('.result-item');
            resultItems.forEach(item => {
                const h4 = item.querySelector('h4');
                if (h4) {
                    h4.style.fontSize = '16px'; // Consistent font size
                }
                item.style.marginBottom = '16px';
            });

            const resultCondition = clonedResultsContent.querySelector('.result-condition');
            if (resultCondition) {
                resultCondition.style.fontSize = '18px'; // Consistent font size
            }

            const confidenceText = clonedResultsContent.querySelector('.confidence-text');
            if (confidenceText) {
                confidenceText.style.fontSize = '12px'; // Consistent font size
            }

            const disclaimer = clonedResultsContent.querySelector('.disclaimer');
            if (disclaimer) {
                const disclaimerP = disclaimer.querySelector('p');
                if (disclaimerP) {
                    disclaimerP.style.fontSize = '12px'; // Consistent font size
                }
                disclaimer.style.marginBottom = '16px';
                disclaimer.style.padding = '12px';
            }

            // Ensure gradient styles are applied to the results content
            const clonedConfidenceFill = clonedResultsContent.querySelector('#confidence-fill');
            if (clonedConfidenceFill) {
                clonedConfidenceFill.style.background = 'linear-gradient(90deg, #8b5cf6, #06b6d4)';
                clonedConfidenceFill.style.height = '100%';
                clonedConfidenceFill.style.borderRadius = '8px';
            }

            const clonedDivider = clonedResultsContent.querySelector('.results-divider');
            if (clonedDivider) {
                clonedDivider.style.background = 'linear-gradient(90deg, #8b5cf6, #06b6d4)';
            }

            // Append the temporary container to the body
            document.body.appendChild(tempContainer);

            // Use html2canvas to capture the temporary container
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#000000',
                scale: 2, // Reduced scale for better performance
                useCORS: true,
                allowTaint: false,
                logging: true
            });

            // Remove the temporary container
            document.body.removeChild(tempContainer);

            // Check if the canvas is empty
            const context = canvas.getContext('2d');
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const isEmpty = !Array.from(imageData).some(value => value !== 0);
            if (isEmpty) {
                throw new Error('Captured canvas is empty. The element might not have rendered correctly. This could be due to a CORS issue with the image.');
            }

            // Convert the canvas to a data URL (PNG format)
            const imageDataUrl = canvas.toDataURL('image/png');

            // Create a temporary link element to trigger the download
            const downloadLink = document.createElement('a');
            downloadLink.href = imageDataUrl;
            downloadLink.download = 'DermaScan_Analysis_Report.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } catch (error) {
            console.error('Error generating report image:', error);
            alert(`Failed to generate the report image: ${error.message}\nPlease check the console for more details. If this is a CORS issue, try uploading an image hosted on a server that allows cross-origin access.`);
        }
    });
});

function setupParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    function setCanvasDimensions() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            const hue = Math.random() * 60 + 240;
            this.color = `hsla(${hue}, 80%, 60%, ${Math.random() * 0.3 + 0.1})`;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            else if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            else if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const particles = [];
    const particleCount = Math.min(100, Math.floor((window.innerWidth * window.innerHeight) / 10000));
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function connectParticles() {
        const maxDistance = 150;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < maxDistance) {
                    const opacity = 1 - distance / maxDistance;
                    ctx.strokeStyle = `rgba(138, 75, 175, ${opacity * 0.15})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const particle of particles) {
            particle.update();
            particle.draw();
        }
        connectParticles();
        requestAnimationFrame(animate);
    }
    
    animate();
}