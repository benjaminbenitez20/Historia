// script.js
document.addEventListener('DOMContentLoaded', () => {
    const topicsContainer = document.getElementById('topics-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const initialMessage = document.getElementById('initial-message'); // Nuevo elemento
    let overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);

    // Función para crear una tarjeta de tema a partir de un objeto de datos de Wikipedia
    // Ahora recibe pageId, title, y extract de la respuesta de la API de Wikipedia
    const createTopicCard = (pageId, title, extract) => {
        const card = document.createElement('article');
        card.classList.add('topic-card');
        card.dataset.pageid = pageId; // Usamos pageId como identificador único para la Wikipedia API
        card.dataset.title = title; // Guardamos el título para referencia

        // Contenido inicial de la tarjeta
        const initialContent = document.createElement('div');
        initialContent.classList.add('card-initial-content');
        initialContent.innerHTML = `
            <h3 class="topic-title">${title}</h3>
            <p class="topic-description">${extract || 'No hay descripción disponible para este tema.'}</p>
            <button class="btn read-more-btn">Leer más</button>
        `;
        card.appendChild(initialContent);

        // Contenido adicional/expandido de la tarjeta (inicialmente vacío, se llenará con la API)
        const additionalInfo = document.createElement('div');
        additionalInfo.classList.add('additional-info');
        additionalInfo.innerHTML = `
            <button class="close-card-btn"><i class="fas fa-times"></i></button>
            <h4 class="expanded-title">${title}</h4>
            <div class="expanded-content">
                <p>Cargando contenido completo...</p>
            </div>
            `;
        card.appendChild(additionalInfo);

        return card;
    };

    // Función para renderizar temas en el DOM
    const renderTopics = (topicsArray) => {
        topicsContainer.innerHTML = ''; // Limpiamos el contenedor para nuevos resultados
        if (initialMessage) {
            initialMessage.style.display = 'none'; // Oculta el mensaje inicial
        }

        if (topicsArray.length === 0) {
            topicsContainer.innerHTML = '<p style="text-align: center; color: #888;">No se encontraron resultados para tu búsqueda. Intenta con otro término.</p>';
            return;
        }

        const fragment = document.createDocumentFragment(); // Para mejor rendimiento
        topicsArray.forEach(topicData => {
            // Wikipedia API devuelve los datos con 'snippet' y 'title'
            // El 'extract' es un resumen corto, útil para la descripción inicial
            const card = createTopicCard(topicData.pageid, topicData.title, topicData.snippet);
            fragment.appendChild(card);
        });
        topicsContainer.appendChild(fragment);

        // Una vez que las tarjetas están en el DOM, inicializar sus listeners
        initializeCardListeners();
    };

    // Función para expandir la tarjeta
    const expandCard = async (card) => {
        // Contraer cualquier otra tarjeta expandida
        document.querySelectorAll('.topic-card.expanded').forEach(expandedCard => {
            if (expandedCard !== card) {
                collapseCard(expandedCard); // Reutiliza la función collapse
            }
        });

        card.classList.add('expanded');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';

        const initialContent = card.querySelector('.card-initial-content');
        const additionalInfo = card.querySelector('.additional-info');
        const expandedContentDiv = card.querySelector('.expanded-content');

        initialContent.style.opacity = '0';
        initialContent.addEventListener('transitionend', function transitionEndHandler() {
            initialContent.style.display = 'none';
            initialContent.removeEventListener('transitionend', transitionEndHandler);
        }, { once: true }); // Usar { once: true } para que el listener se elimine automáticamente
        
        additionalInfo.style.display = 'block';
        setTimeout(() => {
            additionalInfo.style.opacity = '1';
        }, 50);

        // Mueve la tarjeta expandida al final del body para que su z-index funcione correctamente
        document.body.appendChild(card);

        // Cargar contenido completo de Wikipedia si aún no se ha hecho
        // Usamos un dataset para marcar si el contenido ya se cargó
        if (!card.dataset.fullContentLoaded) {
            card.classList.add('loading'); // Añade clase de carga
            const pageId = card.dataset.pageid;
            try {
                // Segunda llamada a la API de Wikipedia para obtener el extracto completo
                // prop=extracts: para obtener el texto del artículo
                // explaintext=1: para que el extracto sea texto plano sin HTML
                // format=json&origin=*: parámetros necesarios
                const response = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=extracts&pageids=${pageId}&explaintext=1&format=json&origin=*`);
                const data = await response.json();
                const page = data.query.pages[pageId];

                if (page && page.extract) {
                    // Reemplazamos el texto 'Cargando contenido...' con el contenido real
                    // Reemplazamos saltos de línea para que se vean como párrafos
                    expandedContentDiv.innerHTML = `<p>${page.extract.replace(/\n/g, '<br><br>')}</p>`;
                    // Añadir un enlace a la página completa de Wikipedia
                    expandedContentDiv.innerHTML += `<p><a href="https://es.wikipedia.org/?curid=${pageId}" target="_blank" rel="noopener noreferrer" style="color: #4CAF50; text-decoration: none; font-weight: bold;">Ver artículo completo en Wikipedia &raquo;</a></p>`;
                    card.dataset.fullContentLoaded = 'true'; // Marcar como cargado
                } else {
                    expandedContentDiv.innerHTML = '<p>No se pudo cargar el contenido completo de Wikipedia para este artículo.</p>';
                }
            } catch (error) {
                console.error('Error al cargar el contenido de Wikipedia:', error);
                expandedContentDiv.innerHTML = '<p style="color: #dc3545;">Error al cargar el contenido. Por favor, inténtalo de nuevo.</p>';
            } finally {
                card.classList.remove('loading'); // Quita la clase de carga
            }
        }
    };

    // Función para contraer la tarjeta
    const collapseCard = (card) => {
        card.classList.remove('expanded');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';

        const initialContent = card.querySelector('.card-initial-content');
        const additionalInfo = card.querySelector('.additional-info');

        additionalInfo.style.opacity = '0';
        additionalInfo.addEventListener('transitionend', function transitionEndHandler() {
            additionalInfo.style.display = 'none';
            additionalInfo.removeEventListener('transitionend', transitionEndHandler);
        }, { once: true });

        initialContent.style.display = 'block';
        setTimeout(() => {
            initialContent.style.opacity = '1';
        }, 50);

        // Devuelve la tarjeta a su posición original en el topicsContainer
        // Como los resultados de búsqueda no tienen un orden fijo predefinido como el JSON,
        // simplemente la volvemos a añadir al topicsContainer.
        topicsContainer.appendChild(card);
    };

    // Función para inicializar los listeners para todas las tarjetas
    const initializeCardListeners = () => {
        // Seleccionar todas las tarjetas que están actualmente en el DOM
        document.querySelectorAll('.topic-card').forEach(card => {
            // Clonar y reemplazar para eliminar listeners anteriores y evitar duplicados
            const oldCardClone = card.cloneNode(true);
            card.parentNode.replaceChild(oldCardClone, card);

            const newCard = oldCardClone; // Ahora trabajamos con la nueva referencia del DOM
            const newCloseBtn = newCard.querySelector('.close-card-btn');
            const readMoreBtn = newCard.querySelector('.read-more-btn'); // Botón "Leer más"

            // Listener para toda la tarjeta.
            // Permite hacer clic en cualquier parte de la tarjeta para expandirla,
            // excepto si el clic proviene del botón de cerrar.
            newCard.addEventListener('click', (event) => {
                if (event.target.closest('.close-card-btn')) {
                    return; // Si el clic es en el botón de cerrar, no expandir.
                }
                expandCard(newCard);
            });

            // Listener específico para el botón de cerrar
            newCloseBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Evita que el clic en el botón de cerrar active el clic de la tarjeta
                collapseCard(newCard);
            });
            
            // Listener específico para el botón "Leer más" (si existe en la tarjeta)
            if (readMoreBtn) {
                readMoreBtn.addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que el clic del botón propague a la tarjeta
                    expandCard(newCard);
                });
            }
        });
    };

    // Cerrar la tarjeta al hacer clic en el overlay
    overlay.addEventListener('click', () => {
        document.querySelectorAll('.topic-card.expanded').forEach(card => {
            collapseCard(card);
        });
    });

    // Cerrar la tarjeta al presionar ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.topic-card.expanded').forEach(card => {
                collapseCard(card);
            });
        }
    });

    // ********** LÓGICA DE BÚSQUEDA EN WIKIPEDIA **********
    const searchWikipedia = async (query) => {
        topicsContainer.innerHTML = '<p style="text-align: center; margin-top: 30px; color: #555;">Buscando resultados...</p>';
        if (initialMessage) {
            initialMessage.style.display = 'none'; // Oculta el mensaje inicial al buscar
        }

        // URL de la API de Wikipedia para búsqueda (en español)
        // action=query: para consultar datos
        // list=search: para buscar artículos
        // srsearch=${encodeURIComponent(query)}: el término de búsqueda
        // format=json: respuesta en JSON
        // srlimit=10: Limita a 10 resultados
        // srprop=snippet: Obtiene un fragmento del texto (útil para la descripción inicial de la tarjeta)
        // exintro=1: solo la introducción del extracto (más corto)
        // explaintext=1: devuelve texto plano sin HTML
        // origin=*: Necesario para peticiones Cross-Origin (CORS) desde el navegador
        const API_URL = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&srprop=snippet&exintro=1&explaintext=1&origin=*`;

        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.query && data.query.search && data.query.search.length > 0) {
                renderTopics(data.query.search); // Renderiza los resultados de la búsqueda
            } else {
                topicsContainer.innerHTML = '<p style="text-align: center; color: #888;">No se encontraron resultados para tu búsqueda. Intenta con otro término.</p>';
            }

        } catch (error) {
            console.error('Error al realizar la búsqueda en Wikipedia:', error);
            topicsContainer.innerHTML = '<p style="text-align: center; color: #dc3545;">Ocurrió un error al buscar en Wikipedia. Por favor, inténtalo de nuevo más tarde.</p>';
        }
    };

    // Event listener para el botón de búsqueda
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim(); // Obtiene el valor del input y quita espacios en blanco
        if (query) {
            searchWikipedia(query); // Si hay un query, realiza la búsqueda
        } else {
            topicsContainer.innerHTML = '<p style="text-align: center; color: #888;">Por favor, introduce un término de búsqueda para empezar.</p>';
            if (initialMessage) initialMessage.style.display = 'block'; // Asegura que el mensaje inicial se muestre si el input está vacío
        }
    });

    // Event listener para presionar Enter en el campo de búsqueda
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click(); // Simula un clic en el botón de búsqueda
        }
    });

    // Mostrar el mensaje inicial al cargar la página
    if (initialMessage) {
        initialMessage.style.display = 'block';
    }
});