document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const recordCount = document.getElementById('recordCount');
    const headers = document.querySelectorAll('th.sortable');

    let publications = [];
    let currentSort = { column: null, direction: 'asc' };

    // Function to parse CSV text
    function parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const result = [];
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];

            // Handle CSV lines where title might contain commas within quotes
            let values = [];
            let inQuotes = false;
            let currentValue = '';

            for (let char of currentLine) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue);

            if (values.length >= 3) {
                result.push({
                    title: values[0] ? values[0].replace(/^"|"$/g, '').trim() : '',
                    iteration: values[1] ? values[1].replace(/^"|"$/g, '').trim() : '',
                    year: values[2] ? parseInt(values[2].trim(), 10) || 0 : 0,
                    doi: values.length >= 4 && values[3] ? values[3].replace(/^"|"$/g, '').trim() : ''
                });
            }
        }
        return result;
    }

    // Function to render table
    function renderTable(data) {
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">No publications found matching your filter criteria.</td>
                </tr>
            `;
            recordCount.textContent = '0 publications found';
            return;
        }

        const fragment = document.createDocumentFragment();

        data.forEach(pub => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${pub.title}</td>
                <td>${pub.iteration}</td>
                <td>${pub.year}</td>
                <td class="actions-col">
                    <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title)}" target="_blank" rel="noopener noreferrer" class="action-btn">
                        [Link]
                    </a>
                </td>
                <td class="actions-col">
                    ${pub.doi ? `<a href="${pub.doi.startsWith('http') ? pub.doi : 'https://doi.org/' + pub.doi}" target="_blank" rel="noopener noreferrer" class="action-btn">[DOI]</a>` : `<span class="action-btn" style="opacity: 0.5; cursor: default;" title="DOI not found">[DOI]</span>`}
                </td>
            `;

            fragment.appendChild(tr);
        });

        tableBody.appendChild(fragment);
        recordCount.textContent = `${data.length} publication${data.length !== 1 ? 's' : ''} found`;
    }

    // Function to sort data
    function sortData(column) {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Update header visual indicators (simple text based since no icons)
        headers.forEach(th => {
            const baseText = th.dataset.sort;
            if (th.dataset.sort === column) {
                const indicator = currentSort.direction === 'asc' ? ' ▼' : ' ▲';
                th.textContent = baseText + indicator;
            } else {
                th.textContent = baseText + ' ↕';
            }
        });

        const sortedData = [...publications].sort((a, b) => {
            let valA, valB;

            switch (column) {
                case 'Title':
                    valA = a.title.toLowerCase();
                    valB = b.title.toLowerCase();
                    break;
                case 'Iteration':
                    valA = a.iteration.toLowerCase();
                    valB = b.iteration.toLowerCase();
                    break;
                case 'Year':
                    valA = a.year;
                    valB = b.year;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Apply filter if any
        filterAndRender(sortedData);
    }

    // Function to filter data
    function filterAndRender(dataToRender = publications) {
        const searchTerm = searchInput.value.toLowerCase();

        let filteredData = dataToRender;

        if (searchTerm) {
            filteredData = dataToRender.filter(pub =>
                pub.title.toLowerCase().includes(searchTerm) ||
                pub.iteration.toLowerCase().includes(searchTerm) ||
                pub.year.toString().includes(searchTerm)
            );
        }

        renderTable(filteredData);
    }

    // Event Listeners
    searchInput.addEventListener('input', () => {
        // Only re-filter the current sorted state
        let currentData = publications;
        if (currentSort.column) {
            currentData = [...publications].sort((a, b) => {
                let valA, valB;
                switch (currentSort.column) {
                    case 'Title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
                    case 'Iteration': valA = a.iteration.toLowerCase(); valB = b.iteration.toLowerCase(); break;
                    case 'Year': valA = a.year; valB = b.year; break;
                }
                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        filterAndRender(currentData);
    });

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            sortData(column);
        });
    });

    // Initialize sorting indicators
    headers.forEach(th => {
        th.textContent = th.dataset.sort + ' ↕';
    });

    // Fetch data
    fetch('publications.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(csvText => {
            publications = parseCSV(csvText);
            renderTable(publications);
        })
        .catch(error => {
            console.error('Error fetching CSV:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Failed to load database.<br>
                        Error: ${error.message}
                    </td>
                </tr>
            `;
        });
});
