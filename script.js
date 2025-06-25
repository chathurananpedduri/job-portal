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

    // --- JWT decode helper ---
    function decodeJWT(token) {
        if (!token) return {};
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decodeURIComponent(escape(decoded)));
        } catch (e) {
            return {};
        }
    }

    const API_BASE_URL = "https://jobportalbackend-whs2.onrender.com";
    let jobs = [];
    let editIndex = null;
    let isAdmin = false;
    let isLoggedIn = false;
    let authToken = localStorage.getItem('authToken');
    let userRole = null;
    let userEmail = localStorage.getItem('userEmail');

    // Always decode the role from the token if present
    if (authToken) {
        const decoded = decodeJWT(authToken);
        userRole = decoded.role || localStorage.getItem('userRole');
        localStorage.setItem('userRole', userRole); // keep in sync
    } else {
        userRole = localStorage.getItem('userRole');
    }

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
            console.log('Fetching jobs with token:', authToken); // Debug log
            const res = await fetch(`${API_BASE_URL}/api/jobs`, {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch jobs: ${res.status}`);
            }
            jobs = await res.json();
            console.log('Fetched jobs:', jobs); // Debug log
            renderJobs();
        } catch (err) {
            console.error('Error fetching jobs:', err); // Debug log
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

            // Add application link section if it exists
            if (job.applicationLink && job.applicationLink.trim()) {
                const linkContainer = document.createElement('div');
                linkContainer.className = 'link-container';
                
                const linkLabel = document.createElement('span');
                linkLabel.className = 'link-label';
                linkLabel.textContent = 'Application Link: ';
                linkContainer.appendChild(linkLabel);
                
                const linkText = document.createElement('a');
                linkText.href = job.applicationLink.startsWith('http') ? job.applicationLink : 'http://' + job.applicationLink;
                linkText.target = '_blank';
                linkText.rel = 'noopener noreferrer';
                linkText.textContent = job.applicationLink;
                linkText.className = 'link-text';
                linkContainer.appendChild(linkText);
                
                card.appendChild(linkContainer);
            }

            const btnRow = document.createElement('div');
            btnRow.className = 'card-btn-row';

            if (job.applicationLink && job.applicationLink.trim()) {
                const applyBtn = document.createElement('a');
                applyBtn.className = 'apply-btn';
                applyBtn.href = job.applicationLink.startsWith('http') ? job.applicationLink : 'http://' + job.applicationLink;
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
                    jobForm.applicationLink.value = job.applicationLink || '';
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
                    if (confirm('Are you sure you want to delete this job?')) {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/jobs/${job.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${authToken}` }
                            });
                            if (!res.ok) {
                                throw new Error('Failed to delete job');
                            }
                            fetchAndRenderJobs();
                        } catch (err) {
                            console.error('Error deleting job:', err);
                            alert('Failed to delete job. Please try again.');
                        }
                    }
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
        const applicationLink = jobForm.applicationLink.value.trim();

        if (!role || !description) {
            formError.textContent = 'Please fill in all required fields.';
            return;
        }
        if (applicationLink && !isValidURL(applicationLink)) {
            formError.textContent = 'Please enter a valid application link (URL).';
            return;
        }

        const job = { 
            role, 
            description, 
            applicationLink: applicationLink || '' // Ensure applicationLink is included
        };
        
        try {
            const endpoint = editIndex !== null ? 
                `${API_BASE_URL}/api/jobs/${jobs[editIndex].id}` : 
                `${API_BASE_URL}/api/jobs`;
            
            const method = editIndex !== null ? 'PUT' : 'POST';
            
            console.log('Sending job data:', { endpoint, method, job }); // Debug log
            
            const res = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(job)
            });
            
            if (!res.ok) {
                throw new Error(`Failed to ${editIndex !== null ? 'update' : 'create'} job: ${res.status}`);
            }
            
            clearForm();
            fetchAndRenderJobs();
        } catch (err) {
            console.error('Error saving job:', err); // Debug log
            formError.textContent = `Failed to save job: ${err.message}`;
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
        // Always decode the role from the token
        if (authToken) {
            const decoded = decodeJWT(authToken);
            userRole = decoded.role || localStorage.getItem('userRole');
            localStorage.setItem('userRole', userRole); // keep in sync
        }
        isAdmin = (userRole && userRole.toLowerCase() === 'admin');
        isLoggedIn = !!authToken;
        
        console.log('Auth Status:', { isAdmin, isLoggedIn, userRole, authToken }); // Debug log
        
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