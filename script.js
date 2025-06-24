document.addEventListener('DOMContentLoaded', function () {
    const jobForm = document.getElementById('jobForm');
    const jobsContainer = document.getElementById('jobsContainer');
    const formError = document.getElementById('formError');
    const formSection = document.querySelector('.form-section');
    const postTab = document.getElementById('postTab');
    const browseTab = document.getElementById('browseTab');
    const jobsSection = document.querySelector('.jobs-section');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const roleLabel = document.getElementById('roleLabel');

    const API_BASE_URL = "https://jobportalbackend-whs2.onrender.com";
    let jobs = [];
    let editIndex = null;
    let isAdmin = false;
    let isLoggedIn = false;
    let authToken = localStorage.getItem('authToken');
    let userRole = localStorage.getItem('userRole');
    let userEmail = localStorage.getItem('userEmail');

    function isValidURL(url) {
        if (!url) return true;
        try {
            new URL(url.startsWith('http') ? url : 'http://' + url);
            return true;
        } catch (e) {
            return false;
        }
    }

    function clearForm() {
        jobForm.reset();
        formError.textContent = '';
        editIndex = null;
        jobForm.querySelector('button[type="submit"]').textContent = 'Post Job Profile';
    }

    async function fetchAndRenderJobs() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/jobs`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            jobs = await res.json();
            renderJobs();
        } catch (err) {
            jobsContainer.innerHTML = '<div style="text-align:center;color:#d8000c;">Failed to load jobs.</div>';
        }
    }

    function renderJobs() {
        jobsContainer.innerHTML = '';
        if (!jobs || jobs.length === 0) {
            jobsContainer.innerHTML = '<div style="text-align:center;color:#888;">No jobs posted yet.</div>';
            return;
        }
        jobs.forEach((job, idx) => {
            const card = document.createElement('div');
            card.className = 'job-card';

            const title = document.createElement('h3');
            title.textContent = job.role;
            card.appendChild(title);

            const desc = document.createElement('p');
            desc.textContent = job.description;
            card.appendChild(desc);

            // Add application link section
            if (job.link && job.link.trim()) {
                const linkContainer = document.createElement('div');
                linkContainer.className = 'link-container';
                
                const linkLabel = document.createElement('span');
                linkLabel.className = 'link-label';
                linkLabel.textContent = 'Application Link: ';
                linkContainer.appendChild(linkLabel);
                
                const linkText = document.createElement('a');
                linkText.href = job.link.startsWith('http') ? job.link : 'http://' + job.link;
                linkText.target = '_blank';
                linkText.rel = 'noopener noreferrer';
                linkText.textContent = job.link;
                linkText.className = 'link-text';
                linkContainer.appendChild(linkText);
                
                card.appendChild(linkContainer);
            }

            const btnRow = document.createElement('div');
            btnRow.className = 'card-btn-row';

            if (job.link && job.link.trim()) {
                const applyBtn = document.createElement('a');
                applyBtn.className = 'apply-btn';
                applyBtn.href = job.link.startsWith('http') ? job.link : 'http://' + job.link;
                applyBtn.target = '_blank';
                applyBtn.rel = 'noopener noreferrer';
                applyBtn.textContent = 'Apply';
                btnRow.appendChild(applyBtn);
            }

            if (isAdmin) {
                const modifyBtn = document.createElement('button');
                modifyBtn.className = 'modify-btn';
                modifyBtn.textContent = 'Modify';
                modifyBtn.onclick = function () {
                    jobForm.jobRole.value = job.role;
                    jobForm.jobDescription.value = job.description;
                    jobForm.applicationLink.value = job.link || '';
                    editIndex = idx;
                    jobForm.querySelector('button[type="submit"]').textContent = 'Update';
                    if (formSection.style.display === 'none') {
                        showPostTab();
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                btnRow.appendChild(modifyBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = async function () {
                    await fetch(`${API_BASE_URL}/api/jobs/${job.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                    fetchAndRenderJobs();
                };
                btnRow.appendChild(deleteBtn);
            }

            card.appendChild(btnRow);
            jobsContainer.appendChild(card);
        });
    }

    jobForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        formError.textContent = '';

        if (!isAdmin) {
            formError.textContent = 'Only admin can create or update jobs.';
            return;
        }

        const role = jobForm.jobRole.value.trim();
        const description = jobForm.jobDescription.value.trim();
        const link = jobForm.applicationLink.value.trim();

        if (!role || !description) {
            formError.textContent = 'Please fill in all required fields.';
            return;
        }
        if (link && !isValidURL(link)) {
            formError.textContent = 'Please enter a valid application link (URL).';
            return;
        }

        const job = { role, description, link };
        try {
            if (editIndex !== null) {
                // Update job
                await fetch(`${API_BASE_URL}/api/jobs/${jobs[editIndex].id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(job)
                });
            } else {
                // Create job
                await fetch(`${API_BASE_URL}/api/jobs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(job)
                });
            }
            clearForm();
            fetchAndRenderJobs();
        } catch (err) {
            formError.textContent = 'Failed to save job.';
        }
    });

    function showPostTab() {
        if (!isAdmin) return;
        formSection.style.display = '';
        postTab.classList.add('active');
        postTab.classList.remove('inactive');
        browseTab.classList.remove('active');
        browseTab.classList.add('inactive');
    }
    function showBrowseTab() {
        formSection.style.display = 'none';
        browseTab.classList.add('active');
        browseTab.classList.remove('inactive');
        postTab.classList.remove('active');
        postTab.classList.add('inactive');
    }

    postTab.addEventListener('click', showPostTab);
    browseTab.addEventListener('click', showBrowseTab);

    function updatePrivileges() {
        isAdmin = (userRole && userRole.toLowerCase() === 'admin');
        isLoggedIn = !!authToken;
        
        // Update UI based on login status
        if (isLoggedIn) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = '';
            roleLabel.textContent = isAdmin ? 'Admin' : 'User';
        } else {
            loginBtn.style.display = '';
            logoutBtn.style.display = 'none';
            roleLabel.textContent = 'Guest';
        }

        // Update admin-specific UI elements
        if (isAdmin) {
            postTab.style.display = '';
            formSection.style.display = '';
            showPostTab();
        } else {
            postTab.style.display = 'none';
            formSection.style.display = 'none';
            showBrowseTab();
        }
        
        fetchAndRenderJobs();
    }

    logoutBtn.addEventListener('click', function () {
        // Clear all auth-related data
        isAdmin = false;
        isLoggedIn = false;
        authToken = null;
        userRole = null;
        userEmail = null;
        localStorage.clear();
        
        // Redirect to login page
        window.location.href = 'login.html';
    });

    window.addEventListener('DOMContentLoaded', function () {
        if (!authToken) {
            window.location.href = 'login.html';
        } else {
            updatePrivileges();
        }
    });
}); 