document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    const htmlElement = document.documentElement;

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // We use data-theme="dark" attribute to trigger the dark variables in theme.css
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        htmlElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        htmlElement.removeAttribute('data-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }

    themeToggleBtn.addEventListener('click', () => {
        if (htmlElement.hasAttribute('data-theme')) {
            htmlElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    });

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const btn = loginForm.querySelector('.btn-primary');
        
        // Add loading state
        const originalText = btn.textContent;
        btn.textContent = 'Signing In...';
        btn.style.opacity = '0.8';
        btn.style.pointerEvents = 'none';
        
        // Simulate API call
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
            alert(`Welcome back to Shukky Shoes, ${email}!`);
        }, 1500);
    });
});
