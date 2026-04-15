(() => {
	const header = document.querySelector('.site-header');
	const scrollIndicator = document.querySelector('.scroll-indicator');
	const hero = document.querySelector('.hero');
	const siteNav = document.querySelector('.site-nav');
	const navLinks = Array.from(document.querySelectorAll('.site-nav__link[href^="#"]'));
	const internalHashLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
	const filterButtons = Array.from(document.querySelectorAll('.projects-filter'));
	const projectTiles = Array.from(document.querySelectorAll('.project-tile'));
	const projectsGrid = document.querySelector('.projects-grid');
	const projectsShowcase = document.querySelector('.projects-showcase');
	const portfolioCards = Array.from(document.querySelectorAll('.portfolio-card'));
	const dashboardTiltFrame = document.querySelector('[data-dashboard-tilt]');
	const aboutSection = document.querySelector('.about-section');
	const aboutReadMoreButton = document.querySelector('.about-section__toggle');
	const aboutReadMoreRegion = document.querySelector('.about-section__more');
	const aboutReadMoreLabel = aboutReadMoreButton?.querySelector('.about-section__toggle-label') || null;
	const contactForm = document.querySelector('.contact-form');
	const contactFormFeedback = document.querySelector('.contact-form__feedback');
	const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
	const prefersFinePointer = window.matchMedia?.('(pointer: fine)');
	const prefersHover = window.matchMedia?.('(hover: hover)');

	if (!header) {
		return;
	}

	const root = document.documentElement;
	const body = document.body;
	const detachThreshold = 72;
	const shrinkThreshold = 72;
	const sections = navLinks
		.map((link) => {
			const selector = link.getAttribute('href');
			const section = selector ? document.querySelector(selector) : null;

			return section ? { link, section } : null;
		})
		.filter(Boolean);
	let expandedHeaderHeight = Math.round(header.getBoundingClientRect().height);
	let expandedHeaderClearance = Math.round(header.getBoundingClientRect().bottom);
	let compactHeaderClearance = expandedHeaderClearance;
	let sectionOffsets = [];
	let ticking = false;
	let heroMotionTicking = false;
	let activeProjectsFilter =
		filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.filter || 'all';
	let pendingProjectsFilter = null;
	let isProjectsFilterAnimating = false;
	let heroPointerTargetX = 0;
	let heroPointerTargetY = 0;
	let heroPointerCurrentX = 0;
	let heroPointerCurrentY = 0;
	let navIndicatorTicking = false;
	let pendingNavIndicatorReveal = false;
	let navLockTargetId = null;
	let navLockExpiresAt = 0;
	let navIndicatorRevealFrame = 0;
	let navIndicatorRevealFrameInner = 0;
	let dashboardTiltTicking = false;
	let heroSpotlightCurrentOpacity = 0;
	let heroSpotlightTargetOpacity = 0;
	let heroSpotlightLastRelativeX = 0.56;
	let heroSpotlightLastRelativeY = 0.38;
	let heroSpotlightHasMoved = false;
	let portfolioRevealVisibleCount = 0;
	let portfolioRevealTargetCount = 0;
	let portfolioRevealTimer = 0;
	const portfolioGalleryIntervals = new WeakMap();
	const portfolioGalleryReadyTimers = new WeakMap();
	const portfolioCardExpandTimers = new WeakMap();
	const portfolioCardCollapseTimers = new WeakMap();
	const suppressedPortfolioTriggerFocus = new WeakSet();
	const dashboardTiltState = {
		baseRotateX: 4,
		baseRotateY: -12,
		baseGlowX: 24,
		baseGlowY: 62,
		baseGlowOpacity: 0.26,
		baseSheenX: 24,
		baseSheenY: 18,
		baseSheenOpacity: 0.62,
		currentRotateX: 0,
		currentRotateY: 0,
		targetRotateX: 0,
		targetRotateY: 0,
		currentLift: 0,
		currentGlowX: 24,
		currentGlowY: 62,
		currentGlowOpacity: 0.26,
		currentSheenX: 24,
		currentSheenY: 18,
		currentSheenOpacity: 0.62,
		targetLift: 0,
		targetGlowX: 24,
		targetGlowY: 62,
		targetGlowOpacity: 0.26,
		targetSheenX: 24,
		targetSheenY: 18,
		targetSheenOpacity: 0.62,
	};

	const shouldReduceMotion = () => Boolean(prefersReducedMotion?.matches);
	const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
	const getPageTop = (element) => element.getBoundingClientRect().top + window.scrollY;
	const getHeaderScrollProgress = (scrollTop = window.scrollY) =>
		clamp(Math.max(scrollTop, 0) / Math.max(shrinkThreshold, 1), 0, 1);
	const roundPixels = (value) => `${Math.round(value)}px`;
	const roundAngle = (value) => `${(Math.round(value * 100) / 100).toFixed(2)}deg`;
	const roundPercent = (value) => `${(Math.round(value * 100) / 100).toFixed(2)}%`;
	const roundScalar = (value) => `${(Math.round(value * 1000) / 1000).toFixed(3)}`;
	const rgbToHsl = (r, g, b) => {
		const normalizedR = r / 255;
		const normalizedG = g / 255;
		const normalizedB = b / 255;
		const max = Math.max(normalizedR, normalizedG, normalizedB);
		const min = Math.min(normalizedR, normalizedG, normalizedB);
		const lightness = (max + min) / 2;
		const delta = max - min;
		let hue = 0;
		let saturation = 0;

		if (delta !== 0) {
			saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

			switch (max) {
				case normalizedR:
					hue = (normalizedG - normalizedB) / delta + (normalizedG < normalizedB ? 6 : 0);
					break;
				case normalizedG:
					hue = (normalizedB - normalizedR) / delta + 2;
					break;
				default:
					hue = (normalizedR - normalizedG) / delta + 4;
					break;
			}

			hue /= 6;
		}

		return { hue, saturation, lightness };
	};
	const hueToRgb = (p, q, t) => {
		let resolvedT = t;

		if (resolvedT < 0) {
			resolvedT += 1;
		}

		if (resolvedT > 1) {
			resolvedT -= 1;
		}

		if (resolvedT < 1 / 6) {
			return p + (q - p) * 6 * resolvedT;
		}

		if (resolvedT < 1 / 2) {
			return q;
		}

		if (resolvedT < 2 / 3) {
			return p + (q - p) * (2 / 3 - resolvedT) * 6;
		}

		return p;
	};
	const hslToRgb = (hue, saturation, lightness) => {
		if (saturation === 0) {
			const value = Math.round(lightness * 255);

			return { red: value, green: value, blue: value };
		}

		const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		const p = 2 * lightness - q;

		return {
			red: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
			green: Math.round(hueToRgb(p, q, hue) * 255),
			blue: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
		};
	};
	const getAnchorRevealGap = (targetId) => (targetId === 'projects-grid' ? 22 : 0);
	const getCurrentHeaderClearance = () => Math.max(Math.round(header.getBoundingClientRect().bottom), 0);
	const getHeaderClearanceForScroll = (scrollTop) =>
		Math.round(
			expandedHeaderClearance + (compactHeaderClearance - expandedHeaderClearance) * getHeaderScrollProgress(scrollTop)
		);
	const resolveAnchorTargetTop = (target, targetId) => {
		const targetPageTop = getPageTop(target);
		const revealGap = getAnchorRevealGap(targetId);
		let resolvedTop = Math.max(targetPageTop - getHeaderClearanceForScroll(window.scrollY) - revealGap, 0);

		for (let index = 0; index < 4; index += 1) {
			const nextTop = Math.max(targetPageTop - getHeaderClearanceForScroll(resolvedTop) - revealGap, 0);

			if (Math.abs(nextTop - resolvedTop) < 1) {
				return nextTop;
			}

			resolvedTop = nextTop;
		}

		return resolvedTop;
	};

	const cancelAnimations = (element) => {
		element?.getAnimations?.().forEach((animation) => animation.cancel());
	};

	const clearProjectsGridInlineStyles = () => {
		if (!projectsGrid) {
			return;
		}

		projectsGrid.style.height = '';
		projectsGrid.style.overflow = '';
	};

	const clearProjectTileInlineStyles = (tile) => {
		tile.style.position = '';
		tile.style.left = '';
		tile.style.top = '';
		tile.style.width = '';
		tile.style.height = '';
		tile.style.margin = '';
		tile.style.zIndex = '';
		tile.style.pointerEvents = '';
		tile.style.visibility = '';
		tile.style.opacity = '';
		tile.style.transform = '';
		tile.style.filter = '';
		tile.style.willChange = '';
	};

	const clearPortfolioCardExpandIntent = (card) => {
		const pendingTimer = portfolioCardExpandTimers.get(card);

		if (!pendingTimer) {
			return;
		}

		window.clearTimeout(pendingTimer);
		portfolioCardExpandTimers.delete(card);
	};

	const clearPortfolioCardCollapseIntent = (card) => {
		const pendingTimer = portfolioCardCollapseTimers.get(card);

		if (!pendingTimer) {
			return;
		}

		window.clearTimeout(pendingTimer);
		portfolioCardCollapseTimers.delete(card);
	};

	const queuePortfolioCardCollapse = (card, delay = 160) => {
		if (!card) {
			return;
		}

		clearPortfolioCardCollapseIntent(card);

		const timerId = window.setTimeout(() => {
			portfolioCardCollapseTimers.delete(card);
			setPortfolioCardExpandedState(card, false);
		}, delay);

		portfolioCardCollapseTimers.set(card, timerId);
	};

	const queuePortfolioCardExpand = (card, delay = 120) => {
		if (!card) {
			return;
		}

		clearPortfolioCardCollapseIntent(card);
		clearPortfolioCardExpandIntent(card);

		const timerId = window.setTimeout(() => {
			portfolioCardExpandTimers.delete(card);
			collapsePortfolioCards(card);
			setPortfolioCardExpandedState(card, true);
		}, delay);

		portfolioCardExpandTimers.set(card, timerId);
	};

	const setPortfolioCardPreviewState = (card, isPreviewing) => {
		if (!card) {
			return;
		}

		card.classList.toggle('is-previewing', Boolean(isPreviewing) && !card.classList.contains('is-expanded'));
	};

	const setPortfolioGallerySlide = (gallery, slideIndex) => {
		if (!gallery) {
			return;
		}

		const slides = Array.from(gallery.querySelectorAll('.portfolio-card__gallery-item'));

		if (!slides.length) {
			return;
		}

		const resolvedIndex = ((slideIndex % slides.length) + slides.length) % slides.length;

		slides.forEach((slide, index) => {
			slide.classList.toggle('is-active', index === resolvedIndex);
		});

		gallery.dataset.activeSlide = String(resolvedIndex);
	};

	const setPortfolioGalleryReadyState = (gallery, isReady) => {
		if (!gallery) {
			return;
		}

		gallery.classList.toggle('is-ready', Boolean(isReady));
	};

	const stopPortfolioGallery = (card, { reset = false } = {}) => {
		const gallery = card?.querySelector('.portfolio-card__gallery');

		if (!gallery) {
			return;
		}

		const pendingReadyTimer = portfolioGalleryReadyTimers.get(gallery);

		if (pendingReadyTimer) {
			window.clearTimeout(pendingReadyTimer);
			portfolioGalleryReadyTimers.delete(gallery);
		}

		const activeInterval = portfolioGalleryIntervals.get(gallery);

		if (activeInterval) {
			window.clearInterval(activeInterval);
			portfolioGalleryIntervals.delete(gallery);
		}

		setPortfolioGalleryReadyState(gallery, false);

		if (reset || shouldReduceMotion()) {
			setPortfolioGallerySlide(gallery, 0);
		}
	};

	const startPortfolioGallery = (card) => {
		const gallery = card?.querySelector('.portfolio-card__gallery');

		if (!gallery) {
			return;
		}

		const slides = Array.from(gallery.querySelectorAll('.portfolio-card__gallery-item'));

		if (!slides.length) {
			return;
		}

		if (portfolioGalleryIntervals.has(gallery) || portfolioGalleryReadyTimers.has(gallery)) {
			return;
		}

		setPortfolioGalleryReadyState(gallery, false);

		if (shouldReduceMotion() || slides.length === 1) {
			setPortfolioGallerySlide(gallery, 0);
			setPortfolioGalleryReadyState(gallery, true);
			return;
		}

		const currentIndex = Number.parseInt(gallery.dataset.activeSlide || '0', 10);
		setPortfolioGallerySlide(gallery, Number.isNaN(currentIndex) ? 0 : currentIndex);

		const readyTimerId = window.setTimeout(() => {
			portfolioGalleryReadyTimers.delete(gallery);
			setPortfolioGalleryReadyState(gallery, true);

			const intervalId = window.setInterval(() => {
				const resolvedCurrentIndex = Number.parseInt(gallery.dataset.activeSlide || '0', 10);
				const nextIndex = (Number.isNaN(resolvedCurrentIndex) ? 0 : resolvedCurrentIndex + 1) % slides.length;
				setPortfolioGallerySlide(gallery, nextIndex);
			}, 2400);

			portfolioGalleryIntervals.set(gallery, intervalId);
		}, 440);

		portfolioGalleryReadyTimers.set(gallery, readyTimerId);
	};

	const setPortfolioCardExpandedState = (card, isExpanded) => {
		if (!card) {
			return;
		}

		const trigger = card.querySelector('.portfolio-card__trigger');
		const overlay = card.querySelector('.portfolio-card__overlay');

		setPortfolioCardPreviewState(card, false);
		card.classList.toggle('is-expanded', isExpanded);

		if (trigger) {
			trigger.setAttribute('aria-expanded', String(isExpanded));
		}

		if (overlay) {
			overlay.setAttribute('aria-hidden', String(!isExpanded));
		}

		if (isExpanded) {
			clearPortfolioCardExpandIntent(card);
			clearPortfolioCardCollapseIntent(card);
			resetPortfolioCardTilt(card);
			startPortfolioGallery(card);
		} else {
			stopPortfolioGallery(card, { reset: true });
		}
	};

	const collapsePortfolioCards = (exceptionCard = null) => {
		portfolioCards.forEach((card) => {
			if (card === exceptionCard) {
				return;
			}

			clearPortfolioCardExpandIntent(card);
			clearPortfolioCardCollapseIntent(card);
			setPortfolioCardExpandedState(card, false);
		});
	};

	const ensurePortfolioCardCloseControl = (card) => {
		const overlay = card?.querySelector('.portfolio-card__overlay');

		if (!overlay) {
			return null;
		}

		const existingCloseButton = overlay.querySelector('.portfolio-card__close');

		if (existingCloseButton) {
			return existingCloseButton;
		}

		const projectName =
			card.querySelector('.portfolio-card__overlay-title')?.textContent?.trim() ||
			card.querySelector('.portfolio-card__title')?.textContent?.trim() ||
			'projektu';
		const closeButton = document.createElement('button');

		closeButton.type = 'button';
		closeButton.className = 'portfolio-card__close';
		closeButton.textContent = '';
		closeButton.setAttribute('aria-label', `Zamknij opis projektu ${projectName}`);

		overlay.append(closeButton);

		return closeButton;
	};

	const extractPortfolioCardAccent = (image) => {
		if (!image?.naturalWidth || !image?.naturalHeight) {
			return null;
		}

		try {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d', { willReadFrequently: true });

			if (!context) {
				return null;
			}

			const sampleSize = 24;
			canvas.width = sampleSize;
			canvas.height = sampleSize;
			context.drawImage(image, 0, 0, sampleSize, sampleSize);

			const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
			let weightedRed = 0;
			let weightedGreen = 0;
			let weightedBlue = 0;
			let totalWeight = 0;
			let fallbackRed = 0;
			let fallbackGreen = 0;
			let fallbackBlue = 0;
			let fallbackWeight = 0;

			for (let index = 0; index < data.length; index += 4) {
				const alpha = data[index + 3] / 255;

				if (alpha < 0.2) {
					continue;
				}

				const red = data[index];
				const green = data[index + 1];
				const blue = data[index + 2];
				const { hue, saturation, lightness } = rgbToHsl(red, green, blue);
				const fallbackPixelWeight = alpha * (0.3 + saturation * 0.7);

				fallbackRed += red * fallbackPixelWeight;
				fallbackGreen += green * fallbackPixelWeight;
				fallbackBlue += blue * fallbackPixelWeight;
				fallbackWeight += fallbackPixelWeight;

				if (lightness < 0.14 || lightness > 0.84 || saturation < 0.12) {
					continue;
				}

				const balance = 1 - Math.abs(lightness - 0.52);
				const hueBias = hue > 0.08 && hue < 0.16 ? 0.88 : 1;
				const pixelWeight = alpha * Math.pow(saturation, 1.35) * (0.45 + balance) * hueBias;

				if (pixelWeight < 0.08) {
					continue;
				}

				weightedRed += red * pixelWeight;
				weightedGreen += green * pixelWeight;
				weightedBlue += blue * pixelWeight;
				totalWeight += pixelWeight;
			}

			if (!totalWeight && !fallbackWeight) {
				return null;
			}

			const baseRed = totalWeight ? weightedRed / totalWeight : fallbackRed / fallbackWeight;
			const baseGreen = totalWeight ? weightedGreen / totalWeight : fallbackGreen / fallbackWeight;
			const baseBlue = totalWeight ? weightedBlue / totalWeight : fallbackBlue / fallbackWeight;
			const { hue, saturation, lightness } = rgbToHsl(baseRed, baseGreen, baseBlue);
			const boostedSaturation = clamp(Math.max(saturation, 0.46), 0.42, 0.84);
			const boostedLightness = clamp(lightness < 0.42 ? lightness + 0.08 : lightness, 0.4, 0.62);
			const boosted = hslToRgb(hue, boostedSaturation, boostedLightness);

			return `${boosted.red}, ${boosted.green}, ${boosted.blue}`;
		} catch (error) {
			return null;
		}
	};

	const syncPortfolioCardAccent = (card) => {
		const image = card?.querySelector('.portfolio-card__image');

		if (!image) {
			return;
		}

		const applyAccent = () => {
			const extractedAccent = extractPortfolioCardAccent(image);

			if (extractedAccent) {
				card.style.setProperty('--portfolio-card-accent-rgb', extractedAccent);
			}
		};

		if (image.complete && image.naturalWidth) {
			applyAccent();
			return;
		}

		image.addEventListener('load', applyAccent, { once: true });
	};

	const resetPortfolioCardTilt = (card, { resetTransition = false } = {}) => {
		if (!card) {
			return;
		}

		card.classList.remove('is-tilting');

		if (resetTransition) {
			card.classList.remove('is-tilt-ready');
		}

		card.style.setProperty('--portfolio-card-rotate-x', '0deg');
		card.style.setProperty('--portfolio-card-rotate-y', '0deg');
		card.style.setProperty('--portfolio-card-lift', '0px');
		card.style.setProperty('--portfolio-card-glow-x', '34%');
		card.style.setProperty('--portfolio-card-glow-y', '28%');
		card.style.setProperty('--portfolio-card-glow-opacity', '0.08');
		card.style.setProperty('--portfolio-card-shadow-x', '0px');
		card.style.setProperty('--portfolio-card-shadow-y', '28px');
		card.style.setProperty('--portfolio-card-shadow-blur', '50px');
		card.style.setProperty('--portfolio-card-shadow-spread', '-24px');
		card.style.setProperty('--portfolio-card-shadow-opacity', '0');
		card.style.setProperty('--portfolio-card-image-zoom', '0');
		card.style.setProperty('--portfolio-card-image-shift-x', '0px');
		card.style.setProperty('--portfolio-card-image-shift-y', '0px');
	};

	const applyPortfolioCardTilt = (card, relativeX, relativeY) => {
		if (!card) {
			return;
		}

		const centeredX = (relativeX - 0.5) * 2;
		const centeredY = (relativeY - 0.5) * 2;

		card.classList.add('is-tilt-ready', 'is-tilting');
		card.style.setProperty('--portfolio-card-rotate-x', roundAngle(clamp(centeredY * -3.2, -2.8, 2.8)));
		card.style.setProperty('--portfolio-card-rotate-y', roundAngle(clamp(centeredX * 4.6, -4.2, 4.2)));
		card.style.setProperty('--portfolio-card-lift', '-4px');
		card.style.setProperty('--portfolio-card-glow-x', roundPercent(14 + relativeX * 72));
		card.style.setProperty('--portfolio-card-glow-y', roundPercent(14 + relativeY * 68));
		card.style.setProperty(
			'--portfolio-card-glow-opacity',
			clamp(0.24 + Math.abs(centeredX) * 0.04 + Math.abs(centeredY) * 0.04, 0.24, 0.34).toFixed(3)
		);
		card.style.setProperty('--portfolio-card-shadow-x', roundPixels(centeredX * 22));
		card.style.setProperty('--portfolio-card-shadow-y', roundPixels(34 + relativeY * 12));
		card.style.setProperty('--portfolio-card-shadow-blur', roundPixels(70 + Math.abs(centeredX) * 10));
		card.style.setProperty('--portfolio-card-shadow-spread', '-26px');
		card.style.setProperty(
			'--portfolio-card-shadow-opacity',
			clamp(0.18 + Math.abs(centeredX) * 0.05 + Math.abs(centeredY) * 0.04, 0.18, 0.3).toFixed(3)
		);
		card.style.setProperty('--portfolio-card-image-zoom', '0.018');
		card.style.setProperty('--portfolio-card-image-shift-x', roundPixels(centeredX * 10));
		card.style.setProperty('--portfolio-card-image-shift-y', roundPixels(centeredY * 8));
	};

	const setPortfolioCardsVisibleCount = (visibleCount) => {
		const resolvedVisibleCount = clamp(visibleCount, 0, portfolioCards.length);

		portfolioRevealVisibleCount = resolvedVisibleCount;

		portfolioCards.forEach((card, index) => {
			const isVisible = index < resolvedVisibleCount;

			card.classList.toggle('is-visible', isVisible);

			if (!isVisible) {
				resetPortfolioCardTilt(card, { resetTransition: true });
				setPortfolioCardExpandedState(card, false);
			}
		});
	};

	const clearPortfolioRevealTimer = () => {
		if (!portfolioRevealTimer) {
			return;
		}

		window.clearTimeout(portfolioRevealTimer);
		portfolioRevealTimer = 0;
	};

	const queuePortfolioRevealStep = () => {
		if (portfolioRevealTimer || portfolioRevealVisibleCount === portfolioRevealTargetCount || shouldReduceMotion()) {
			return;
		}

		portfolioRevealTimer = window.setTimeout(() => {
			portfolioRevealTimer = 0;

			if (portfolioRevealVisibleCount === portfolioRevealTargetCount) {
				return;
			}

			const direction = portfolioRevealVisibleCount < portfolioRevealTargetCount ? 1 : -1;

			setPortfolioCardsVisibleCount(portfolioRevealVisibleCount + direction);

			if (portfolioRevealVisibleCount !== portfolioRevealTargetCount) {
				queuePortfolioRevealStep();
			}
		}, 140);
	};

	const syncPortfolioRevealCount = (nextVisibleCount, { immediate = false } = {}) => {
		portfolioRevealTargetCount = clamp(nextVisibleCount, 0, portfolioCards.length);

		if (shouldReduceMotion() || immediate) {
			clearPortfolioRevealTimer();
			setPortfolioCardsVisibleCount(portfolioRevealTargetCount);
			return;
		}

		if (portfolioRevealVisibleCount === portfolioRevealTargetCount) {
			return;
		}

		queuePortfolioRevealStep();
	};

	const updatePortfolioCardsReveal = ({ immediate = false } = {}) => {
		if (!projectsShowcase || !portfolioCards.length) {
			return;
		}

		if (shouldReduceMotion()) {
			syncPortfolioRevealCount(portfolioCards.length, { immediate: true });
			return;
		}

		const sectionRect = projectsShowcase.getBoundingClientRect();
		const viewportHeight = Math.max(window.innerHeight || 0, 1);
		const revealStart = viewportHeight * 0.42;
		const revealDistance = revealStart - sectionRect.top;
		const revealStep = clamp(
			sectionRect.height / (portfolioCards.length + 1),
			Math.max(viewportHeight * 0.14, 110),
			Math.max(viewportHeight * 0.2, 170)
		);
		const targetVisibleCount =
			revealDistance < 0 ? 0 : clamp(Math.floor(revealDistance / revealStep) + 1, 0, portfolioCards.length);

		syncPortfolioRevealCount(targetVisibleCount, { immediate });
	};

	const bindPortfolioCards = () => {
		if (!portfolioCards.length) {
			return;
		}

		portfolioCards.forEach((card) => {
			const trigger = card.querySelector('.portfolio-card__trigger');
			const closeButton = ensurePortfolioCardCloseControl(card);

			setPortfolioCardExpandedState(card, false);
			resetPortfolioCardTilt(card, { resetTransition: true });
			syncPortfolioCardAccent(card);

			if (!trigger) {
				return;
			}

			card.addEventListener('pointerenter', () => {
				if (!prefersHover?.matches || !prefersFinePointer?.matches) {
					return;
				}

				clearPortfolioCardCollapseIntent(card);
			});

			trigger.addEventListener('pointerenter', () => {
				if (!prefersHover?.matches || !prefersFinePointer?.matches) {
					return;
				}

				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, true);

				if (card.classList.contains('is-expanded')) {
					return;
				}

				queuePortfolioCardExpand(card, 110);
			});

			trigger.addEventListener('pointerleave', () => {
				if (!prefersHover?.matches || !prefersFinePointer?.matches || card.classList.contains('is-expanded')) {
					return;
				}

				clearPortfolioCardExpandIntent(card);
				setPortfolioCardPreviewState(card, false);
			});

			trigger.addEventListener('focus', () => {
				if (suppressedPortfolioTriggerFocus.has(trigger)) {
					suppressedPortfolioTriggerFocus.delete(trigger);
					return;
				}

				clearPortfolioCardExpandIntent(card);
				clearPortfolioCardCollapseIntent(card);
				collapsePortfolioCards(card);
				setPortfolioCardExpandedState(card, true);
			});

			trigger.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				clearPortfolioCardExpandIntent(card);
				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, false);

				if (prefersHover?.matches && prefersFinePointer?.matches) {
					collapsePortfolioCards(card);
					setPortfolioCardExpandedState(card, true);
					return;
				}

				const shouldExpand = !card.classList.contains('is-expanded');
				const shouldMoveFocusToClose = document.activeElement === trigger;

				collapsePortfolioCards(shouldExpand ? card : null);
				setPortfolioCardExpandedState(card, shouldExpand);

				if (shouldExpand && shouldMoveFocusToClose) {
					closeButton?.focus();
				}
			});

				if (closeButton) {
					closeButton.addEventListener('click', (event) => {
						event.preventDefault();
						event.stopPropagation();
						clearPortfolioCardExpandIntent(card);
						clearPortfolioCardCollapseIntent(card);
						setPortfolioCardPreviewState(card, false);
						setPortfolioCardExpandedState(card, false);

						if (event.detail === 0) {
							suppressedPortfolioTriggerFocus.add(trigger);
							trigger.focus();
						}
					});
				}

			card.addEventListener('pointerleave', () => {
				clearPortfolioCardExpandIntent(card);
				setPortfolioCardPreviewState(card, false);
				resetPortfolioCardTilt(card);

				if (!prefersHover?.matches || !prefersFinePointer?.matches) {
					return;
				}

				queuePortfolioCardCollapse(card, 180);
			});

			card.addEventListener('focusout', (event) => {
				const nextTarget = event.relatedTarget;

				if (nextTarget && card.contains(nextTarget)) {
					return;
				}

				clearPortfolioCardExpandIntent(card);
				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, false);
				resetPortfolioCardTilt(card);

				if (card.classList.contains('is-expanded')) {
					setPortfolioCardExpandedState(card, false);
				}
			});

			card.addEventListener('keydown', (event) => {
				if (event.key !== 'Escape') {
					return;
				}

				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, false);
				setPortfolioCardExpandedState(card, false);
				trigger.focus();
			});
		});

		document.addEventListener('pointerdown', (event) => {
			const clickedInsideCard = portfolioCards.some((card) => card.contains(event.target));

			if (clickedInsideCard) {
				return;
			}

			collapsePortfolioCards();
		});

		document.documentElement.addEventListener('mouseleave', () => {
			portfolioCards.forEach((card) => {
				clearPortfolioCardExpandIntent(card);
				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, false);
				resetPortfolioCardTilt(card);
			});
		});

		window.addEventListener('blur', () => {
			portfolioCards.forEach((card) => {
				clearPortfolioCardExpandIntent(card);
				clearPortfolioCardCollapseIntent(card);
				setPortfolioCardPreviewState(card, false);
				resetPortfolioCardTilt(card);
			});
		});
	};

	const animateAboutSectionLayoutShift = (mutation) => {
		if (!aboutSection) {
			mutation();
			return;
		}

		cancelAnimations(aboutSection);
		aboutSection.style.willChange = '';

		const aboutTopBefore = aboutSection.getBoundingClientRect().top;

		mutation();

		if (shouldReduceMotion() || !aboutSection.animate) {
			return;
		}

		const aboutTopAfter = aboutSection.getBoundingClientRect().top;
		const deltaY = aboutTopBefore - aboutTopAfter;

		if (Math.abs(deltaY) < 1) {
			return;
		}

		aboutSection.style.willChange = 'transform, opacity';

		const animation = aboutSection.animate(
			[
				{ transform: `translateY(${deltaY}px)`, opacity: 0.96 },
				{ transform: 'translateY(0px)', opacity: 1 },
			],
			{
				duration: 420,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
				fill: 'none',
			}
		);

		animation.finished
			.catch(() => {})
			.then(() => {
				aboutSection.style.willChange = '';
				animation.cancel();
			});
	};

	const animateElement = (element, keyframes, options, { persist = false } = {}) => {
		if (!element?.animate) {
			return Promise.resolve();
		}

		const animation = element.animate(keyframes, options);

		return animation.finished
			.catch(() => {})
			.then(() => {
				if (persist) {
					animation.commitStyles?.();
				}

				animation.cancel();
			});
	};

	const setActiveLink = (targetId, { reveal = false } = {}) => {
		navLinks.forEach((link) => {
			const isActive = link.getAttribute('href') === `#${targetId}`;

			link.classList.toggle('site-nav__link--active', isActive);

			if (isActive) {
				link.setAttribute('aria-current', 'page');
				return;
			}

			link.removeAttribute('aria-current');
		});

		queueNavIndicatorUpdate(reveal);
	};

	const updateNavIndicator = ({ reveal = false } = {}) => {
		if (!siteNav) {
			return;
		}

		const activeLink = navLinks.find((link) => link.classList.contains('site-nav__link--active'));

		siteNav.classList.add('is-enhanced');

		if (!activeLink) {
			siteNav.style.setProperty('--site-nav-indicator-opacity', '0');
			return;
		}

		const indicatorHeight = 2;
		const indicatorOffset = 2 * (1 - getHeaderScrollProgress());
		const indicatorX = activeLink.offsetLeft;
		const indicatorY = activeLink.offsetTop + activeLink.offsetHeight - indicatorHeight - indicatorOffset;
		const indicatorWidth = activeLink.offsetWidth;

		siteNav.style.setProperty('--site-nav-indicator-x', `${indicatorX.toFixed(2)}px`);
		siteNav.style.setProperty('--site-nav-indicator-y', `${indicatorY.toFixed(2)}px`);
		siteNav.style.setProperty('--site-nav-indicator-width', `${indicatorWidth.toFixed(2)}px`);
		siteNav.style.setProperty('--site-nav-indicator-opacity', '1');

		if (!reveal) {
			siteNav.style.setProperty('--site-nav-indicator-scale', '1');
			return;
		}

		window.cancelAnimationFrame(navIndicatorRevealFrame);
		window.cancelAnimationFrame(navIndicatorRevealFrameInner);
		siteNav.style.setProperty('--site-nav-indicator-scale', '0');
		navIndicatorRevealFrame = window.requestAnimationFrame(() => {
			navIndicatorRevealFrameInner = window.requestAnimationFrame(() => {
				siteNav.style.setProperty('--site-nav-indicator-scale', '1');
			});
		});
	};

	const queueNavIndicatorUpdate = (reveal = false) => {
		if (!siteNav || navIndicatorTicking) {
			pendingNavIndicatorReveal = pendingNavIndicatorReveal || reveal;
			return;
		}

		pendingNavIndicatorReveal = pendingNavIndicatorReveal || reveal;
		navIndicatorTicking = true;
		window.requestAnimationFrame(() => {
			navIndicatorTicking = false;
			const shouldReveal = pendingNavIndicatorReveal;
			pendingNavIndicatorReveal = false;
			updateNavIndicator({ reveal: shouldReveal });
		});
	};

	const cacheSectionOffsets = () => {
		sectionOffsets = sections.map(({ section }) => ({
			id: section.id,
			top: getPageTop(section),
		}));
	};

	const renderHeroMotion = () => {
		if (!hero) {
			heroMotionTicking = false;
			return;
		}

		heroPointerCurrentX += (heroPointerTargetX - heroPointerCurrentX) * 0.14;
		heroPointerCurrentY += (heroPointerTargetY - heroPointerCurrentY) * 0.14;

		const heroRect = hero.getBoundingClientRect();
		const scrollProgress = clamp(
			(window.innerHeight - heroRect.top) / Math.max(window.innerHeight + heroRect.height, 1),
			0,
			1
		);
		const scrollCentered = (scrollProgress - 0.5) * 2;
		const pointerX = heroPointerCurrentX;
		const pointerY = heroPointerCurrentY;

		hero.style.setProperty('--hero-content-shift-x', '0px');
		hero.style.setProperty('--hero-content-shift-y', '0px');
		hero.style.setProperty('--hero-backdrop-shift-x', roundPixels(pointerX * 10));
		hero.style.setProperty('--hero-backdrop-shift-y', roundPixels(scrollCentered * -20));
		hero.style.setProperty('--hero-glow-shift-x', roundPixels(pointerX * 14));
		hero.style.setProperty('--hero-glow-shift-y', roundPixels(pointerY * 8));
		hero.style.setProperty('--hero-art-shift-x', roundPixels(pointerX * 14));
		hero.style.setProperty('--hero-art-shift-y', roundPixels(scrollCentered * -20 + pointerY * 10));
		hero.style.setProperty('--hero-tilt-x', roundAngle(clamp(pointerY * -3.4 + scrollCentered * 1.2, -5.5, 5.5)));
		hero.style.setProperty('--hero-tilt-y', roundAngle(clamp(pointerX * 5, -7, 7)));
		hero.style.setProperty('--hero-screen-laptop-x', '0px');
		hero.style.setProperty('--hero-screen-laptop-y', '0px');
		hero.style.setProperty('--hero-screen-phone-x', '0px');
		hero.style.setProperty('--hero-screen-phone-y', '0px');
		hero.style.setProperty('--hero-code-shift-x', '0px');
		hero.style.setProperty('--hero-code-shift-y', '0px');
		hero.style.setProperty('--hero-sheen-offset', roundPixels(pointerX * 28 + scrollCentered * 12));
		heroSpotlightTargetOpacity *= hero.classList.contains('is-pointer-active') ? 0.965 : 0.9;
		heroSpotlightCurrentOpacity += (heroSpotlightTargetOpacity - heroSpotlightCurrentOpacity) * 0.16;
		hero.style.setProperty('--hero-spotlight-opacity', roundScalar(heroSpotlightCurrentOpacity));

		heroMotionTicking = false;

		if (
			Math.abs(heroPointerTargetX - heroPointerCurrentX) > 0.002 ||
			Math.abs(heroPointerTargetY - heroPointerCurrentY) > 0.002 ||
			heroSpotlightTargetOpacity > 0.002 ||
			heroSpotlightCurrentOpacity > 0.002
		) {
			queueHeroMotion();
		}
	};

	const queueHeroMotion = () => {
		if (!hero || heroMotionTicking || shouldReduceMotion()) {
			return;
		}

		heroMotionTicking = true;
		window.requestAnimationFrame(renderHeroMotion);
	};

	const resetHeroPointer = () => {
		if (!hero) {
			return;
		}

		hero.classList.remove('is-pointer-active');
		heroPointerTargetX = 0;
		heroPointerTargetY = 0;
		heroSpotlightTargetOpacity = 0;
		heroSpotlightHasMoved = false;
		queueHeroMotion();
	};

	const resetHeroMotion = () => {
		if (!hero) {
			return;
		}

		hero.classList.remove('is-pointer-active');
		heroPointerTargetX = 0;
		heroPointerTargetY = 0;
		queueHeroMotion();
	};

	const updateHeroSpotlight = (relativeX, relativeY) => {
		if (!hero) {
			return;
		}

		const spotlightX = clamp(relativeX, 0, 1);
		const spotlightY = clamp(relativeY, 0, 1);
		const deltaX = heroSpotlightHasMoved ? spotlightX - heroSpotlightLastRelativeX : 0;
		const deltaY = heroSpotlightHasMoved ? spotlightY - heroSpotlightLastRelativeY : 0;
		const movement = Math.hypot(deltaX, deltaY);
		const boostedOpacity = clamp(0.3 + movement * 16, 0.3, 0.96);

		heroSpotlightHasMoved = true;
		heroSpotlightLastRelativeX = spotlightX;
		heroSpotlightLastRelativeY = spotlightY;
		hero.style.setProperty('--hero-pointer-x', `${(spotlightX * 100).toFixed(2)}%`);
		hero.style.setProperty('--hero-pointer-y', `${(spotlightY * 100).toFixed(2)}%`);
		heroSpotlightTargetOpacity = Math.max(heroSpotlightTargetOpacity, boostedOpacity);
	};

	const bindHeroMotion = () => {
		if (!hero) {
			return;
		}

		if (shouldReduceMotion()) {
			resetHeroPointer();
			return;
		}

		queueHeroMotion();

		if (!prefersFinePointer?.matches) {
			return;
		}

		window.addEventListener(
			'pointermove',
			(event) => {
				if (event.pointerType === 'touch') {
					return;
				}

				updateHeroSpotlight(
					event.clientX / Math.max(window.innerWidth, 1),
					event.clientY / Math.max(window.innerHeight, 1)
				);
				queueHeroMotion();
			},
			{ passive: true }
		);

		hero.addEventListener('pointermove', (event) => {
			if (event.pointerType === 'touch') {
				return;
			}

			const heroRect = hero.getBoundingClientRect();
			const relativeX = clamp((event.clientX - heroRect.left) / Math.max(heroRect.width, 1), 0, 1);
			const relativeY = clamp((event.clientY - heroRect.top) / Math.max(heroRect.height, 1), 0, 1);

			heroPointerTargetX = (relativeX - 0.5) * 2;
			heroPointerTargetY = (relativeY - 0.45) * 2;
			hero.classList.add('is-pointer-active');
			queueHeroMotion();
		});

		hero.addEventListener('pointerleave', resetHeroMotion);
		document.documentElement.addEventListener('mouseleave', resetHeroPointer);
		window.addEventListener('blur', resetHeroPointer);
	};

	const renderDashboardTilt = () => {
		if (!dashboardTiltFrame) {
			dashboardTiltTicking = false;
			return;
		}

		dashboardTiltState.currentRotateX += (dashboardTiltState.targetRotateX - dashboardTiltState.currentRotateX) * 0.18;
		dashboardTiltState.currentRotateY += (dashboardTiltState.targetRotateY - dashboardTiltState.currentRotateY) * 0.18;
		dashboardTiltState.currentLift += (dashboardTiltState.targetLift - dashboardTiltState.currentLift) * 0.16;
		dashboardTiltState.currentGlowX += (dashboardTiltState.targetGlowX - dashboardTiltState.currentGlowX) * 0.16;
		dashboardTiltState.currentGlowY += (dashboardTiltState.targetGlowY - dashboardTiltState.currentGlowY) * 0.16;
		dashboardTiltState.currentGlowOpacity +=
			(dashboardTiltState.targetGlowOpacity - dashboardTiltState.currentGlowOpacity) * 0.14;
		dashboardTiltState.currentSheenX += (dashboardTiltState.targetSheenX - dashboardTiltState.currentSheenX) * 0.18;
		dashboardTiltState.currentSheenY += (dashboardTiltState.targetSheenY - dashboardTiltState.currentSheenY) * 0.18;
		dashboardTiltState.currentSheenOpacity +=
			(dashboardTiltState.targetSheenOpacity - dashboardTiltState.currentSheenOpacity) * 0.14;

		dashboardTiltFrame.style.setProperty(
			'--dashboard-frame-rotate-x',
			roundAngle(dashboardTiltState.baseRotateX + dashboardTiltState.currentRotateX)
		);
		dashboardTiltFrame.style.setProperty(
			'--dashboard-frame-rotate-y',
			roundAngle(dashboardTiltState.baseRotateY + dashboardTiltState.currentRotateY)
		);
		dashboardTiltFrame.style.setProperty('--dashboard-frame-lift', roundPixels(dashboardTiltState.currentLift));
		dashboardTiltFrame.style.setProperty('--dashboard-frame-glow-x', roundPercent(dashboardTiltState.currentGlowX));
		dashboardTiltFrame.style.setProperty('--dashboard-frame-glow-y', roundPercent(dashboardTiltState.currentGlowY));
		dashboardTiltFrame.style.setProperty(
			'--dashboard-frame-glow-opacity',
			dashboardTiltState.currentGlowOpacity.toFixed(3)
		);
		dashboardTiltFrame.style.setProperty('--dashboard-screen-sheen-x', roundPercent(dashboardTiltState.currentSheenX));
		dashboardTiltFrame.style.setProperty('--dashboard-screen-sheen-y', roundPercent(dashboardTiltState.currentSheenY));
		dashboardTiltFrame.style.setProperty(
			'--dashboard-screen-sheen-opacity',
			dashboardTiltState.currentSheenOpacity.toFixed(3)
		);

		dashboardTiltTicking = false;

		if (
			Math.abs(dashboardTiltState.targetRotateX - dashboardTiltState.currentRotateX) > 0.02 ||
			Math.abs(dashboardTiltState.targetRotateY - dashboardTiltState.currentRotateY) > 0.02 ||
			Math.abs(dashboardTiltState.targetLift - dashboardTiltState.currentLift) > 0.12 ||
			Math.abs(dashboardTiltState.targetGlowX - dashboardTiltState.currentGlowX) > 0.12 ||
			Math.abs(dashboardTiltState.targetGlowY - dashboardTiltState.currentGlowY) > 0.12 ||
			Math.abs(dashboardTiltState.targetGlowOpacity - dashboardTiltState.currentGlowOpacity) > 0.01 ||
			Math.abs(dashboardTiltState.targetSheenX - dashboardTiltState.currentSheenX) > 0.12 ||
			Math.abs(dashboardTiltState.targetSheenY - dashboardTiltState.currentSheenY) > 0.12 ||
			Math.abs(dashboardTiltState.targetSheenOpacity - dashboardTiltState.currentSheenOpacity) > 0.01
		) {
			queueDashboardTilt();
		}
	};

	const queueDashboardTilt = () => {
		if (!dashboardTiltFrame || dashboardTiltTicking || shouldReduceMotion()) {
			return;
		}

		dashboardTiltTicking = true;
		window.requestAnimationFrame(renderDashboardTilt);
	};

	const resetDashboardTilt = ({ immediate = false } = {}) => {
		if (!dashboardTiltFrame) {
			return;
		}

		dashboardTiltFrame.classList.remove('is-tilting');
		dashboardTiltState.targetRotateX = 0;
		dashboardTiltState.targetRotateY = 0;
		dashboardTiltState.targetLift = 0;
		dashboardTiltState.targetGlowX = dashboardTiltState.baseGlowX;
		dashboardTiltState.targetGlowY = dashboardTiltState.baseGlowY;
		dashboardTiltState.targetGlowOpacity = dashboardTiltState.baseGlowOpacity;
		dashboardTiltState.targetSheenX = dashboardTiltState.baseSheenX;
		dashboardTiltState.targetSheenY = dashboardTiltState.baseSheenY;
		dashboardTiltState.targetSheenOpacity = dashboardTiltState.baseSheenOpacity;

		if (!immediate) {
			queueDashboardTilt();
			return;
		}

		dashboardTiltState.currentRotateX = 0;
		dashboardTiltState.currentRotateY = 0;
		dashboardTiltState.currentLift = 0;
		dashboardTiltState.currentGlowX = dashboardTiltState.baseGlowX;
		dashboardTiltState.currentGlowY = dashboardTiltState.baseGlowY;
		dashboardTiltState.currentGlowOpacity = dashboardTiltState.baseGlowOpacity;
		dashboardTiltState.currentSheenX = dashboardTiltState.baseSheenX;
		dashboardTiltState.currentSheenY = dashboardTiltState.baseSheenY;
		dashboardTiltState.currentSheenOpacity = dashboardTiltState.baseSheenOpacity;
		renderDashboardTilt();
	};

	const bindDashboardTilt = () => {
		if (!dashboardTiltFrame) {
			return;
		}

		resetDashboardTilt({ immediate: true });

		if (shouldReduceMotion() || !prefersFinePointer?.matches) {
			return;
		}

		dashboardTiltFrame.addEventListener('pointermove', (event) => {
			if (event.pointerType === 'touch') {
				return;
			}

			const frameRect = dashboardTiltFrame.getBoundingClientRect();
			const relativeX = clamp((event.clientX - frameRect.left) / Math.max(frameRect.width, 1), 0, 1);
			const relativeY = clamp((event.clientY - frameRect.top) / Math.max(frameRect.height, 1), 0, 1);
			const centeredX = (relativeX - 0.5) * 2;
			const centeredY = (relativeY - 0.5) * 2;

			dashboardTiltState.targetRotateX = clamp(centeredY * -5.4, -4.8, 4.8);
			dashboardTiltState.targetRotateY = clamp(centeredX * 8.2, -7.2, 7.2);
			dashboardTiltState.targetLift = -6;
			dashboardTiltState.targetGlowX = 16 + relativeX * 68;
			dashboardTiltState.targetGlowY = 16 + relativeY * 62;
			dashboardTiltState.targetGlowOpacity = 0.8;
			dashboardTiltState.targetSheenX = 12 + relativeX * 76;
			dashboardTiltState.targetSheenY = 10 + relativeY * 62;
			dashboardTiltState.targetSheenOpacity = 0.9;
			dashboardTiltFrame.classList.add('is-tilting');
			queueDashboardTilt();
		});

		dashboardTiltFrame.addEventListener('pointerleave', () => {
			resetDashboardTilt();
		});

		window.addEventListener('blur', () => {
			resetDashboardTilt({ immediate: true });
		});
	};

	const updateActiveSection = () => {
		if (!sectionOffsets.length) {
			return;
		}

		if (navLockTargetId) {
			const lockedSection = sections.find(({ section }) => section.id === navLockTargetId)?.section;
			const lockedTargetTop = lockedSection ? resolveAnchorTargetTop(lockedSection, lockedSection.id) : 0;
			const hasReachedTarget = lockedSection ? Math.abs(window.scrollY - lockedTargetTop) < 28 : false;

			if (performance.now() < navLockExpiresAt && !hasReachedTarget) {
				setActiveLink(navLockTargetId);
				return;
			}

			navLockTargetId = null;
			navLockExpiresAt = 0;
		}

		const checkpoint = window.scrollY + getCurrentHeaderClearance() + Math.min(window.innerHeight * 0.22, 180);
		let activeId = sectionOffsets[0].id;

		sectionOffsets.forEach(({ id, top }) => {
			if (top <= checkpoint) {
				activeId = id;
			}
		});

		setActiveLink(activeId);
	};

	const syncActiveLinkWithHash = () => {
		const hashId = window.location.hash.replace('#', '');
		const targetSection = sections.find(({ section }) => section.id === hashId);

		if (!targetSection) {
			return;
		}

		setActiveLink(targetSection.section.id);
	};

	const syncHeaderMetrics = () => {
		const currentProgress = getHeaderScrollProgress();

		root.style.setProperty('--site-header-scroll-progress', '0');
		const expandedHeight = Math.round(header.getBoundingClientRect().height);
		const expandedClearance = Math.max(Math.round(header.getBoundingClientRect().bottom), 0);

		root.style.setProperty('--site-header-scroll-progress', '1');
		const compactClearance = Math.max(Math.round(header.getBoundingClientRect().bottom), 0);

		root.style.setProperty('--site-header-scroll-progress', currentProgress.toFixed(4));
		body.classList.remove('header-is-detached', 'header-is-shrunk');

		expandedHeaderHeight = expandedHeight;
		expandedHeaderClearance = expandedClearance;
		compactHeaderClearance = compactClearance;
		root.style.setProperty('--site-header-height', `${expandedHeight}px`);
		root.style.setProperty('--site-header-offset', `${expandedHeight}px`);
	};

	const updateHeaderState = () => {
		const currentScrollY = Math.max(window.scrollY, 0);
		const headerScrollProgress = getHeaderScrollProgress(currentScrollY);

		root.style.setProperty('--site-header-scroll-progress', headerScrollProgress.toFixed(4));
		body.classList.remove('header-is-detached', 'header-is-shrunk');

		if (scrollIndicator) {
			scrollIndicator.classList.toggle('is-hidden', currentScrollY > detachThreshold);
		}

		updateActiveSection();
		queueNavIndicatorUpdate();
		queueHeroMotion();
		updatePortfolioCardsReveal();
		ticking = false;
	};

	const queueUpdate = () => {
		if (ticking) {
			return;
		}

		ticking = true;
		window.requestAnimationFrame(updateHeaderState);
	};

	const updateFilterButtons = (nextFilter) => {
		filterButtons.forEach((button) => {
			const isActive = button.dataset.filter === nextFilter;

			button.classList.toggle('is-active', isActive);
			button.setAttribute('aria-pressed', String(isActive));
		});
	};

	const applyProjectsFilterState = (nextFilter) => {
		updateFilterButtons(nextFilter);

		animateAboutSectionLayoutShift(() => {
			projectTiles.forEach((tile) => {
				const tileCategory = tile.dataset.category;
				const shouldShow = nextFilter === 'all' || tileCategory === nextFilter;

				tile.hidden = !shouldShow;
			});
		});

		activeProjectsFilter = nextFilter;
		cacheSectionOffsets();
		updateActiveSection();
	};

	const prepareProjectsFilterAnimation = () => {
		clearProjectsGridInlineStyles();
		cancelAnimations(projectsGrid);

		projectTiles.forEach((tile) => {
			cancelAnimations(tile);
			clearProjectTileInlineStyles(tile);
		});
	};

	const finishProjectsFilterAnimation = (nextFilter, leavingTiles, enteringTiles, stayingTiles) => {
		leavingTiles.forEach((tile) => {
			clearProjectTileInlineStyles(tile);
			tile.hidden = true;
		});

		enteringTiles.forEach(clearProjectTileInlineStyles);
		stayingTiles.forEach(clearProjectTileInlineStyles);

		animateAboutSectionLayoutShift(() => {
			clearProjectsGridInlineStyles();
			activeProjectsFilter = nextFilter;
			isProjectsFilterAnimating = false;
		});
		cacheSectionOffsets();
		updateActiveSection();

		if (pendingProjectsFilter && pendingProjectsFilter !== activeProjectsFilter) {
			const queuedFilter = pendingProjectsFilter;

			pendingProjectsFilter = null;
			setProjectsFilter(queuedFilter);
			return;
		}

		pendingProjectsFilter = null;
	};

	const animateProjectsFilter = (nextFilter) => {
		if (!projectsGrid) {
			applyProjectsFilterState(nextFilter);
			return;
		}

		const currentVisibleTiles = projectTiles.filter((tile) => !tile.hidden);
		const nextVisibleTiles = projectTiles.filter(
			(tile) => nextFilter === 'all' || tile.dataset.category === nextFilter
		);
		const nextVisibleSet = new Set(nextVisibleTiles);
		const currentVisibleSet = new Set(currentVisibleTiles);
		const stayingTiles = currentVisibleTiles.filter((tile) => nextVisibleSet.has(tile));
		const leavingTiles = currentVisibleTiles.filter((tile) => !nextVisibleSet.has(tile));
		const enteringTiles = nextVisibleTiles.filter((tile) => !currentVisibleSet.has(tile));

		if (!leavingTiles.length && !enteringTiles.length) {
			activeProjectsFilter = nextFilter;
			return;
		}

		prepareProjectsFilterAnimation();

		const firstHeight = projectsGrid.getBoundingClientRect().height;
		projectsGrid.style.height = `${firstHeight}px`;
		projectsGrid.style.overflow = 'hidden';

		const exitAnimations = currentVisibleTiles.map((tile, index) => {
			tile.style.willChange = 'transform, opacity, filter';

			return animateElement(
				tile,
				[
					{ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
					{ opacity: 0, transform: 'translateY(20px) scale(0.985)', filter: 'blur(6px)' },
				],
				{
					duration: 180,
					delay: index * 16,
					easing: 'cubic-bezier(0.4, 0, 1, 1)',
					fill: 'forwards',
				},
				{ persist: true }
			);
		});

		Promise.allSettled(exitAnimations).then(() => {
			const enterAnimations = [];

			animateAboutSectionLayoutShift(() => {
				currentVisibleTiles.forEach((tile) => {
					clearProjectTileInlineStyles(tile);
					tile.hidden = true;
				});

				nextVisibleTiles.forEach((tile) => {
					tile.hidden = false;
					clearProjectTileInlineStyles(tile);
					tile.style.opacity = '0';
					tile.style.transform = 'translateY(22px) scale(0.98)';
					tile.style.filter = 'blur(8px)';
					tile.style.willChange = 'transform, opacity, filter';
				});

				const lastHeight = projectsGrid.scrollHeight;
				projectsGrid.style.height = `${lastHeight}px`;

				nextVisibleTiles.forEach((tile, index) => {
					enterAnimations.push(
						animateElement(
							tile,
							[
								{ opacity: 0, transform: 'translateY(22px) scale(0.98)', filter: 'blur(8px)' },
								{ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
							],
							{
								duration: 340,
								delay: 40 + index * 28,
								easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
								fill: 'forwards',
							},
							{ persist: true }
						)
					);
				});
			});

			Promise.allSettled(enterAnimations).then(() => {
				finishProjectsFilterAnimation(nextFilter, leavingTiles, enteringTiles, stayingTiles);
			});
		});
	};

	const setProjectsFilter = (nextFilter, options = {}) => {
		const { animate = true } = options;

		if (!filterButtons.length || !projectTiles.length) {
			return;
		}

		if (nextFilter === activeProjectsFilter && !isProjectsFilterAnimating) {
			updateFilterButtons(nextFilter);
			return;
		}

		if (!animate || shouldReduceMotion() || !projectsGrid?.animate) {
			prepareProjectsFilterAnimation();
			applyProjectsFilterState(nextFilter);
			return;
		}

		updateFilterButtons(nextFilter);

		if (isProjectsFilterAnimating) {
			pendingProjectsFilter = nextFilter;
			return;
		}

		isProjectsFilterAnimating = true;
		pendingProjectsFilter = null;
		animateProjectsFilter(nextFilter);
	};

	const bindProjectFilters = () => {
		if (!filterButtons.length) {
			return;
		}

		const initialFilter =
			filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.filter || 'all';

		filterButtons.forEach((button) => {
			button.addEventListener('click', () => {
				const nextFilter = button.dataset.filter || 'all';

				setProjectsFilter(nextFilter);
			});
		});

		setProjectsFilter(initialFilter, { animate: false });
	};

	const scrollToHashTarget = (targetId, { behavior = 'smooth', updateHash = true, reveal = false } = {}) => {
		const target = document.getElementById(targetId);

		if (!target) {
			return false;
		}

		const targetHash = `#${targetId}`;
		const matchingSection = sections.find(({ section }) => section.id === targetId)?.section;
		const targetTop = resolveAnchorTargetTop(target, targetId);

		if (matchingSection) {
			navLockTargetId = matchingSection.id;
			navLockExpiresAt = performance.now() + 1200;
			setActiveLink(matchingSection.id, { reveal });
		}

		if (updateHash) {
			if (window.location.hash === targetHash) {
				window.history.replaceState(null, '', targetHash);
			} else {
				window.history.pushState(null, '', targetHash);
			}
		}

		window.scrollTo({
			top: targetTop,
			behavior: shouldReduceMotion() ? 'auto' : behavior,
		});

		if (!matchingSection) {
			updateActiveSection();
		}

		return true;
	};

	const bindNavigation = () => {
		internalHashLinks.forEach((link) => {
			link.addEventListener('click', (event) => {
				const targetId = link.getAttribute('href')?.replace('#', '');

				if (!targetId || !document.getElementById(targetId)) {
					return;
				}

				event.preventDefault();
				scrollToHashTarget(targetId, {
					reveal: link.classList.contains('site-nav__link'),
				});
			});
		});
	};

	const bindContactFormDemo = () => {
		if (!contactForm) {
			return;
		}

		contactForm.addEventListener('submit', (event) => {
			event.preventDefault();

			if (contactFormFeedback) {
				contactFormFeedback.textContent = 'Dzieki! Formularz jest gotowy do podpiecia pod wysylke.';
				contactFormFeedback.classList.add('is-visible');
			}

			contactForm.reset();
		});
	};

	const bindAboutReadMore = () => {
		if (!aboutReadMoreButton || !aboutReadMoreRegion) {
			return;
		}

		let aboutReadMoreAnimation = null;

		const syncAboutReadMoreLabel = (isExpanded) => {
			if (!aboutReadMoreLabel) {
				return;
			}

			aboutReadMoreLabel.textContent = isExpanded ? 'Pokaż mniej' : 'Czytaj więcej';
		};

		const stopAboutReadMoreAnimation = () => {
			if (!aboutReadMoreAnimation) {
				return;
			}

			aboutReadMoreAnimation.cancel();
			aboutReadMoreAnimation = null;
		};

		const finalizeAboutReadMoreMetrics = () => {
			cacheSectionOffsets();
			updateActiveSection();
		};

		const applyExpandedState = () => {
			stopAboutReadMoreAnimation();
			aboutReadMoreRegion.hidden = false;
			aboutReadMoreButton.classList.add('is-expanded');
			aboutReadMoreButton.setAttribute('aria-expanded', 'true');
			syncAboutReadMoreLabel(true);

			if (shouldReduceMotion() || !aboutReadMoreRegion.animate) {
				aboutReadMoreRegion.style.height = '';
				aboutReadMoreRegion.style.opacity = '';
				aboutReadMoreRegion.style.transform = '';
				aboutReadMoreRegion.style.overflow = '';
				finalizeAboutReadMoreMetrics();
				return;
			}

			const targetHeight = aboutReadMoreRegion.scrollHeight;

			aboutReadMoreRegion.style.height = '0px';
			aboutReadMoreRegion.style.opacity = '0';
			aboutReadMoreRegion.style.transform = 'translateY(-8px)';
			aboutReadMoreRegion.style.overflow = 'hidden';

			aboutReadMoreAnimation = aboutReadMoreRegion.animate(
				[
					{ height: '0px', opacity: 0, transform: 'translateY(-8px)' },
					{ height: `${targetHeight}px`, opacity: 1, transform: 'translateY(0px)' },
				],
				{
					duration: 420,
					easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
					fill: 'forwards',
				}
			);

			aboutReadMoreAnimation.finished
				.catch(() => {})
				.then(() => {
					aboutReadMoreAnimation = null;
					aboutReadMoreRegion.style.height = '';
					aboutReadMoreRegion.style.opacity = '';
					aboutReadMoreRegion.style.transform = '';
					aboutReadMoreRegion.style.overflow = '';
					finalizeAboutReadMoreMetrics();
				});
		};

		const applyCollapsedState = () => {
			stopAboutReadMoreAnimation();
			aboutReadMoreButton.classList.remove('is-expanded');
			aboutReadMoreButton.setAttribute('aria-expanded', 'false');
			syncAboutReadMoreLabel(false);

			if (shouldReduceMotion() || !aboutReadMoreRegion.animate) {
				aboutReadMoreRegion.hidden = true;
				aboutReadMoreRegion.style.height = '';
				aboutReadMoreRegion.style.opacity = '';
				aboutReadMoreRegion.style.transform = '';
				aboutReadMoreRegion.style.overflow = '';
				finalizeAboutReadMoreMetrics();
				return;
			}

			const currentHeight = aboutReadMoreRegion.scrollHeight;

			aboutReadMoreRegion.style.height = `${currentHeight}px`;
			aboutReadMoreRegion.style.opacity = '1';
			aboutReadMoreRegion.style.transform = 'translateY(0px)';
			aboutReadMoreRegion.style.overflow = 'hidden';

			aboutReadMoreAnimation = aboutReadMoreRegion.animate(
				[
					{ height: `${currentHeight}px`, opacity: 1, transform: 'translateY(0px)' },
					{ height: '0px', opacity: 0, transform: 'translateY(-8px)' },
				],
				{
					duration: 300,
					easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
					fill: 'forwards',
				}
			);

			aboutReadMoreAnimation.finished
				.catch(() => {})
				.then(() => {
					aboutReadMoreAnimation = null;
					aboutReadMoreRegion.hidden = true;
					aboutReadMoreRegion.style.height = '';
					aboutReadMoreRegion.style.opacity = '';
					aboutReadMoreRegion.style.transform = '';
					aboutReadMoreRegion.style.overflow = '';
					finalizeAboutReadMoreMetrics();
				});
		};

		aboutReadMoreButton.addEventListener('click', () => {
			const shouldExpand = aboutReadMoreButton.getAttribute('aria-expanded') !== 'true';

			if (shouldExpand) {
				applyExpandedState();
				return;
			}

			applyCollapsedState();
		});
	};

	const refreshState = () => {
		resetDashboardTilt({ immediate: true });
		syncHeaderMetrics();
		cacheSectionOffsets();
		updateHeaderState();
	};

	const refreshAfterNavigation = () => {
		window.requestAnimationFrame(() => {
			syncHeaderMetrics();
			cacheSectionOffsets();
			window.requestAnimationFrame(() => {
				const hashId = window.location.hash.replace('#', '');

				if (hashId) {
					scrollToHashTarget(hashId, {
						behavior: 'auto',
						updateHash: false,
					});
				}

				updateHeaderState();
				syncActiveLinkWithHash();
			});
		});
	};

	bindNavigation();
	bindProjectFilters();
	bindAboutReadMore();
	bindContactFormDemo();
	bindHeroMotion();
	bindDashboardTilt();
	bindPortfolioCards();
	syncActiveLinkWithHash();

	window.addEventListener('scroll', queueUpdate, { passive: true });
	window.addEventListener('resize', refreshState);
	window.addEventListener('load', refreshAfterNavigation);
	window.addEventListener('hashchange', refreshAfterNavigation);

	if (document.fonts?.ready) {
		document.fonts.ready.then(refreshState).catch(() => {});
	}

	refreshState();

	if (window.location.hash) {
		refreshAfterNavigation();
	}
})();
