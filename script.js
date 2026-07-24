let allData = [];
let filteredData = [];
let currentMode = 'dreUgel'; 

// Variables de Paginación
let currentPage = 1;
const itemsPerPage = 20;

// Elementos del DOM
const loadingMessage = document.getElementById('loadingMessage');
const controlsSection = document.getElementById('controlsSection');
const searchInput = document.getElementById('searchInput');

// Tablas y vistas
const initialMessage = document.getElementById('initialMessage');
const tableWrapper = document.getElementById('tableWrapper');
const tableBody = document.getElementById('tableBody');
const statsContainer = document.getElementById('statsContainer');
const statsText = document.getElementById('statsText');

// Botones y Paginación
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const pageIndicator = document.getElementById('pageIndicator');

// Elementos UI de Toggles
const searchModeRadios = document.querySelectorAll('input[name="searchMode"]');
const dreUgelGroup = document.getElementById('dreUgelGroup');
const ubicacionGroup = document.getElementById('ubicacionGroup');

// Selectores de Filtros
const filters = {
    dre: document.getElementById('dreFilter'),
    ugel: document.getElementById('ugelFilter'),
    dept: document.getElementById('deptFilter'),
    prov: document.getElementById('provFilter'),
    dist: document.getElementById('distFilter'),
    area: document.getElementById('areaFilter'),
    nivel: document.getElementById('nivelFilter'),
    gestion: document.getElementById('gestionFilter'),
    modalidad: document.getElementById('modalidadFilter')
};

// ID de la hoja de cálculo de Google
const SHEET_ID = "1-P3gfMbONUqllGhuozFimKK-mtInwpas190bA9MPZJk";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Lógica de carga
document.addEventListener('DOMContentLoaded', () => {
    Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allData = results.data.filter(row => {
                const hasName = row["NOMBRE DEL CCYT"] || row["NOMBRE DE LA I.E."];
                const hasNA = Object.values(row).some(val => val && val.toString().trim().toUpperCase() === '#N/A');
                return hasName && !hasNA;
            });
            
            loadingMessage.style.display = 'none';
            controlsSection.style.display = 'block';
            
            initDropdowns();
            // Ya no calculamos ni mostramos nada hasta que el usuario presione "Iniciar Búsqueda"
        },
        error: function(err) {
            loadingMessage.innerHTML = `<h3 style="color:red;">Error de conexión</h3>
                                        <p>No se pudo cargar la información. Verifica los permisos de la hoja.</p>`;
            console.error("Error PapaParse:", err);
        }
    });
});

// Extraer niveles
function getLevels(row) {
    let levels = [];
    if (row['CM INICIAL'] && row['CM INICIAL'].trim() !== '') levels.push('INICIAL');
    if (row['CM PRIMARIA'] && row['CM PRIMARIA'].trim() !== '') levels.push('PRIMARIA');
    if (row['CM SECUNDARIA'] && row['CM SECUNDARIA'].trim() !== '') levels.push('SECUNDARIA');
    return levels;
}

// Función auxiliar para rellenar un <select>
function fillSelect(selectElement, setValues) {
    const defaultText = selectElement.getAttribute('data-default') || 'Todos';
    const currentVal = selectElement.value;
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    
    Array.from(setValues).sort().forEach(val => {
        if(val) {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            selectElement.appendChild(option);
        }
    });

    if (setValues.has(currentVal)) {
        selectElement.value = currentVal;
    }
}

// Inicializar menús bases
function initDropdowns() {
    const sets = {
        dre: new Set(), dept: new Set(),
        area: new Set(), gestion: new Set(), modalidad: new Set()
    };

    allData.forEach(row => {
        if (row['DRE/GRE']) sets.dre.add(row['DRE/GRE'].trim());
        if (row['DEPARTAMENTO']) sets.dept.add(row['DEPARTAMENTO'].trim());
        if (row['AREA']) sets.area.add(row['AREA'].trim());
        if (row['TIPO DE GESTION']) sets.gestion.add(row['TIPO DE GESTION'].trim());
        if (row['MODALIDAD']) sets.modalidad.add(row['MODALIDAD'].trim());
    });

    fillSelect(filters.dre, sets.dre);
    fillSelect(filters.dept, sets.dept);
    fillSelect(filters.area, sets.area);
    fillSelect(filters.gestion, sets.gestion);
    fillSelect(filters.modalidad, sets.modalidad);

    updateCascadingDRE();
    updateCascadingDept();
}

// Lógica de menús en cascada
function updateCascadingDRE() {
    const dreVal = filters.dre.value;
    const ugels = new Set();
    allData.forEach(row => {
        if (dreVal === "" || (row['DRE/GRE'] && row['DRE/GRE'].trim() === dreVal)) {
            if (row['UGEL']) ugels.add(row['UGEL'].trim());
        }
    });
    fillSelect(filters.ugel, ugels);
}

function updateCascadingDept() {
    const deptVal = filters.dept.value;
    const provs = new Set();
    allData.forEach(row => {
        if (deptVal === "" || (row['DEPARTAMENTO'] && row['DEPARTAMENTO'].trim() === deptVal)) {
            if (row['PROVINCIA']) provs.add(row['PROVINCIA'].trim());
        }
    });
    fillSelect(filters.prov, provs);
    updateCascadingProv(); 
}

function updateCascadingProv() {
    const deptVal = filters.dept.value;
    const provVal = filters.prov.value;
    const dists = new Set();
    
    allData.forEach(row => {
        const matchDept = deptVal === "" || (row['DEPARTAMENTO'] && row['DEPARTAMENTO'].trim() === deptVal);
        const matchProv = provVal === "" || (row['PROVINCIA'] && row['PROVINCIA'].trim() === provVal);
        
        if (matchDept && matchProv) {
            if (row['DISTRITO']) dists.add(row['DISTRITO'].trim());
        }
    });
    fillSelect(filters.dist, dists);
}

// Toggle entre Modos de Búsqueda
searchModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if (currentMode === 'dreUgel') {
            dreUgelGroup.style.display = 'contents';
            ubicacionGroup.style.display = 'none';
            // Resetear sección inactiva (Ubicación)
            filters.dept.value = '';
            filters.prov.value = '';
            filters.dist.value = '';
            updateCascadingDept();
        } else {
            dreUgelGroup.style.display = 'none';
            ubicacionGroup.style.display = 'contents';
            // Resetear sección inactiva (DRE)
            filters.dre.value = '';
            filters.ugel.value = '';
            updateCascadingDRE();
        }
    });
});

// Cambios en cascada
filters.dre.addEventListener('change', updateCascadingDRE);
filters.dept.addEventListener('change', updateCascadingDept);
filters.prov.addEventListener('change', updateCascadingProv);

// Botón de Inicio de Búsqueda (Reemplaza la ejecución automática)
searchBtn.addEventListener('click', () => {
    applyFilters();
});

// Contadores de IE únicas
function updateStats(data) {
    const ccytCount = data.length;
    const ieSet = new Set();
    
    data.forEach(row => {
        const dre = row['DRE/GRE'] || '';
        const ugel = row['UGEL'] || '';
        const prov = row['PROVINCIA'] || '';
        const dist = row['DISTRITO'] || '';
        const nombreIE = row['NOMBRE DE LA I.E.'] || '';
        const uniqueKey = `${dre}-${ugel}-${prov}-${dist}-${nombreIE}`;
        if(uniqueKey !== '----') ieSet.add(uniqueKey);
    });

    statsText.innerHTML = `<strong>${ccytCount}</strong> CCYT encontrados en <strong>${ieSet.size}</strong> Instituciones Educativas`;
}

// Motor de Filtro
function applyFilters() {
    const searchText = searchInput.value.toLowerCase();
    
    const vals = {
        dre: filters.dre.value, ugel: filters.ugel.value,
        dept: filters.dept.value, prov: filters.prov.value, dist: filters.dist.value,
        area: filters.area.value, nivel: filters.nivel.value,
        gestion: filters.gestion.value, modalidad: filters.modalidad.value
    };

    filteredData = allData.filter(row => {
        const matchText = (row['NOMBRE DEL CCYT'] && row['NOMBRE DEL CCYT'].toLowerCase().includes(searchText)) || 
                          (row['NOMBRE DE LA I.E.'] && row['NOMBRE DE LA I.E.'].toLowerCase().includes(searchText));
        
        let matchGrupoEspecifico = true;
        if (currentMode === 'dreUgel') {
            const matchDre = vals.dre === "" || (row['DRE/GRE'] && row['DRE/GRE'].trim() === vals.dre);
            const matchUgel = vals.ugel === "" || (row['UGEL'] && row['UGEL'].trim() === vals.ugel);
            matchGrupoEspecifico = matchDre && matchUgel;
        } else {
            const matchDept = vals.dept === "" || (row['DEPARTAMENTO'] && row['DEPARTAMENTO'].trim() === vals.dept);
            const matchProv = vals.prov === "" || (row['PROVINCIA'] && row['PROVINCIA'].trim() === vals.prov);
            const matchDist = vals.dist === "" || (row['DISTRITO'] && row['DISTRITO'].trim() === vals.dist);
            matchGrupoEspecifico = matchDept && matchProv && matchDist;
        }

        const matchArea = vals.area === "" || (row['AREA'] && row['AREA'].trim() === vals.area);
        const matchGestion = vals.gestion === "" || (row['TIPO DE GESTION'] && row['TIPO DE GESTION'].trim() === vals.gestion);
        const matchModalidad = vals.modalidad === "" || (row['MODALIDAD'] && row['MODALIDAD'].trim() === vals.modalidad);

        let matchNivel = true;
        if (vals.nivel !== "") {
            const levels = getLevels(row);
            // Comprobamos ignorando mayúsculas/minúsculas
            matchNivel = levels.some(lvl => lvl.toLowerCase() === vals.nivel.toLowerCase());
        }

        return matchText && matchGrupoEspecifico && matchArea && matchGestion && matchModalidad && matchNivel;
    });

    // Actualizar estados visuales
    currentPage = 1;
    initialMessage.style.display = 'none';
    tableWrapper.style.display = 'block';
    statsContainer.style.display = 'block';
    exportBtn.style.display = 'inline-block';
    
    updateStats(filteredData);
    renderTable();
}

// Renderizado de Tabla Paginada
function renderTable() {
    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No se encontraron resultados para los filtros aplicados.</td></tr>`;
        updatePaginationInfo(0);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredData.slice(start, end);

    const fragment = document.createDocumentFragment();

    paginatedItems.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Número correlativo real de la búsqueda
        const correlativo = start + index + 1;
        
        const nombreClub = row['NOMBRE DEL CCYT'] || '-';
        const nombreIE = row['NOMBRE DE LA I.E.'] || '-';
        const ubi = `${row['DEPARTAMENTO'] || ''}, ${row['PROVINCIA'] || ''}, ${row['DISTRITO'] || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
        const dregel = `${row['DRE/GRE'] || ''} <br> ${row['UGEL'] || ''}`;
        
        const levels = getLevels(row);
        let badgesHtml = '';
        levels.forEach(level => { badgesHtml += `<span class="badge ${level.toLowerCase()}">${level}</span>`; });

        let ruralInfoHtml = '';
        if (row['AREA'] && row['AREA'].trim().toLowerCase() === 'rural') {
            if (row['CENTRO POBLADO']) ruralInfoHtml += `<div class="detail-text"><strong>C.P.:</strong> ${row['CENTRO POBLADO']}</div>`;
            if (row['LOCALIDAD']) ruralInfoHtml += `<div class="detail-text"><strong>Loc:</strong> ${row['LOCALIDAD']}</div>`;
        }

        tr.innerHTML = `
            <td><strong>${correlativo}</strong></td>
            <td><div class="table-title">${nombreClub}</div></td>
            <td><div class="table-subtitle">${nombreIE}</div></td>
            <td><div class="detail-text">${ubi}</div></td>
            <td><div class="detail-text">${dregel}</div></td>
            <td>${badgesHtml}</td>
            <td>
                <div class="detail-text"><strong>Gestión:</strong> ${row['TIPO DE GESTION'] || '-'}</div>
                <div class="detail-text"><strong>Modalidad:</strong> ${row['MODALIDAD'] || '-'}</div>
                <div class="detail-text"><strong>Área:</strong> ${row['AREA'] || '-'}</div>
                ${ruralInfoHtml}
            </td>
        `;
        fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
    updatePaginationInfo(filteredData.length);
}

// Lógica de Controles de Paginación
function updatePaginationInfo(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    
    btnPrev.disabled = (currentPage === 1);
    btnNext.disabled = (currentPage === totalPages || totalItems === 0);
}

btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

btnNext.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Botón Limpiar Búsqueda
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    Object.values(filters).forEach(select => select.value = '');
    
    updateCascadingDRE();
    updateCascadingDept();
    
    // Ocultar resultados y resetear vista
    tableWrapper.style.display = 'none';
    statsContainer.style.display = 'none';
    exportBtn.style.display = 'none';
    initialMessage.style.display = 'block';
});

// Botón Exportar a CSV
exportBtn.addEventListener('click', () => {
    if (filteredData.length === 0) return;
    
    const dataToExport = filteredData.map(row => {
        const cleanedRow = { ...row };
        delete cleanedRow['N°']; 
        return cleanedRow;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Clubes_CCYT_Filtrados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});