/* ==========================================================================
   PORTFOLIO — RAHARIJAONA Christian
   JavaScript natif, sans dépendance. Chaque module est isolé : si l'un échoue,
   les autres (et le contenu de la page) continuent de fonctionner.

   Modules
   1. Année du pied de page
   2. Menu mobile
   3. Apparition au défilement
   4. Navigation active
   5. Études de cas (<dialog>)
   6. Bouton retour en haut
   7. Copie de l'adresse e-mail
   8. Formulaire de contact
   9. Portrait de secours
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(selector, context) { return (context || doc).querySelector(selector); }
  function $$(selector, context) { return Array.prototype.slice.call((context || doc).querySelectorAll(selector)); }

  /** Exécute un module sans jamais casser les autres. */
  function safe(name, fn, onError) {
    try {
      fn();
    } catch (err) {
      if (window.console) { console.error('[portfolio] module « ' + name + ' » en échec :', err); }
      if (typeof onError === 'function') { onError(); }
    }
  }

  /* ------------------------------------------------------------------------
     1. Année du pied de page
     ------------------------------------------------------------------------ */
  function initYear() {
    var el = $('#year');
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }

  /* ------------------------------------------------------------------------
     2. Menu mobile
     ------------------------------------------------------------------------ */
  function initMenu() {
    var toggle = $('.nav-toggle');
    var list = $('#nav-list');
    var nav = $('.site-nav');
    if (!toggle || !list || !nav) { return; }

    var label = $('.nav-toggle-label', toggle);
    var mobileQuery = window.matchMedia('(max-width: 768px)');

    function setOpen(open, returnFocus) {
      list.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) { label.textContent = open ? 'Fermer' : 'Menu'; }
      if (!open && returnFocus) { toggle.focus(); }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Fermeture après sélection d'un lien
    $$('a', list).forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    // Échap : ferme et rend le focus au bouton
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false, true);
      }
    });

    // Clic en dehors du menu
    doc.addEventListener('click', function (event) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(event.target)) {
        setOpen(false);
      }
    });

    // Le focus quitte le menu au clavier : on le referme
    nav.addEventListener('focusout', function (event) {
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      var next = event.relatedTarget;
      if (next && !nav.contains(next)) { setOpen(false); }
    });

    // Retour au bureau : état propre
    function onChange() { if (!mobileQuery.matches) { setOpen(false); } }
    if (mobileQuery.addEventListener) { mobileQuery.addEventListener('change', onChange); }
    else if (mobileQuery.addListener) { mobileQuery.addListener(onChange); }

    setOpen(false);
  }

  /* ------------------------------------------------------------------------
     3. Apparition au défilement (désactivée si mouvement réduit)
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) { return; }

    function showAll() { items.forEach(function (el) { el.classList.add('is-visible'); }); }

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    // Décalage léger entre éléments frères, plafonné pour ne jamais ralentir la lecture
    var counters = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var index = counters.get(parent) || 0;
      counters.set(parent, index + 1);
      el.style.setProperty('--reveal-delay', Math.min(index, 3) * 70 + 'ms');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------------
     4. Navigation active (section au centre-haut de l'écran)
     ------------------------------------------------------------------------ */
  function initActiveNav() {
    var links = $$('.nav-list a[data-nav]');
    var sections = $$('[data-nav-group]');
    if (!links.length || !sections.length) { return; }

    function setActive(group) {
      links.forEach(function (link) {
        var on = link.getAttribute('data-nav') === group;
        link.classList.toggle('is-active', on);
        if (on) { link.setAttribute('aria-current', 'location'); }
        else { link.removeAttribute('aria-current'); }
      });
    }

    // Un clic donne un retour immédiat, sans attendre la fin du défilement
    links.forEach(function (link) {
      link.addEventListener('click', function () { setActive(link.getAttribute('data-nav')); });
    });

    if ('IntersectionObserver' in window) {
      // Bande fine à ~30 % du haut de l'écran : fonctionne aussi pour les sections très hautes
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { setActive(entry.target.getAttribute('data-nav-group')); }
        });
      }, { rootMargin: '-30% 0px -65% 0px', threshold: 0 });
      sections.forEach(function (section) { observer.observe(section); });
    }

    // Bas de page : la dernière section reste active même si elle est courte
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var atBottom = window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4;
        if (atBottom) { setActive('contact'); }
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     5. Études de cas (<dialog> natif)
     ------------------------------------------------------------------------ */
  function initCaseStudies() {
    var dialogs = $$('dialog.case-modal');
    var triggers = $$('[data-open-case]');
    if (!dialogs.length || !triggers.length) { return; }

    // Met à jour l'adresse (lien partageable) sans jamais bloquer l'ouverture si le navigateur refuse
    function setHash(hash) {
      try { if (window.history && history.replaceState) { history.replaceState(null, '', hash); } }
      catch (e) { /* sans conséquence : l'étude s'ouvre quand même */ }
    }

    function openDialog(dialog) {
      if (!dialog || dialog.open) { return; }
      if (typeof dialog.showModal === 'function') { dialog.showModal(); }
      else { dialog.setAttribute('open', ''); }
      root.classList.add('modal-open');
      var body = $('.modal-body', dialog);
      if (body) { body.scrollTop = 0; }
      setHash('#' + dialog.id);
    }

    function closeDialog(dialog) {
      if (typeof dialog.close === 'function') { dialog.close(); }
      else { dialog.removeAttribute('open'); afterClose(dialog); }
    }

    function afterClose() {
      if (!$$('dialog.case-modal').some(function (d) { return d.open; })) { root.classList.remove('modal-open'); }
      if (/^#cs-/.test(location.hash)) { setHash('#projets'); }
    }

    triggers.forEach(function (button) {
      button.addEventListener('click', function () {
        openDialog(doc.getElementById(button.getAttribute('data-open-case')));
      });
    });

    // La carte entière est cliquable (le bouton reste le contrôle accessible)
    $$('.case-card').forEach(function (card) {
      card.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) { return; }
        var button = $('[data-open-case]', card);
        if (button) { button.click(); }
      });
    });

    dialogs.forEach(function (dialog) {
      $$('[data-close-case]', dialog).forEach(function (btn) {
        btn.addEventListener('click', function () { closeDialog(dialog); });
      });
      // Clic sur le fond (le <dialog> lui-même, hors contenu)
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) { closeDialog(dialog); }
      });
      dialog.addEventListener('close', function () { afterClose(dialog); });
    });

    // Lien direct vers une étude de cas : /#cs-reclamations
    var target = location.hash && doc.getElementById(location.hash.slice(1));
    if (target && target.matches('dialog.case-modal')) {
      var projects = doc.getElementById('projets');
      if (projects) { projects.scrollIntoView(); }
      openDialog(target);
    }
  }

  /* ------------------------------------------------------------------------
     6. Bouton retour en haut
     ------------------------------------------------------------------------ */
  function initToTop() {
    var button = $('#to-top');
    if (!button) { return; }

    var ticking = false;
    function update() {
      ticking = false;
      button.hidden = window.scrollY < 700;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      var brand = $('.brand');
      if (brand) { brand.focus({ preventScroll: true }); }
    });
  }

  /* ------------------------------------------------------------------------
     7. Copie de l'adresse e-mail
     ------------------------------------------------------------------------ */
  function initCopy() {
    var buttons = $$('[data-copy]');
    var live = $('#copy-status');
    if (!buttons.length) { return; }

    function fallbackCopy(text) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(area);
      return ok;
    }

    buttons.forEach(function (button) {
      button.hidden = false; // le bouton n'existe que si JavaScript fonctionne
      button.addEventListener('click', function () {
        var text = button.getAttribute('data-copy');
        var done = function (ok) {
          var original = button.getAttribute('data-label') || button.textContent;
          button.setAttribute('data-label', original);
          button.textContent = ok ? 'Copié' : 'Échec';
          if (live) { live.textContent = ok ? 'Adresse e-mail copiée.' : 'La copie a échoué. Sélectionnez l\'adresse manuellement.'; }
          window.setTimeout(function () { button.textContent = original; if (live) { live.textContent = ''; } }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
        } else {
          done(fallbackCopy(text));
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. Formulaire de contact
        - validation accessible (messages liés aux champs, focus sur la 1re erreur)
        - anti double envoi
        - protection : champ piège + délai minimal avant envoi
        - envoi via FormSubmit (AJAX). Sans JavaScript, le formulaire reste un
          POST classique vers la même adresse.
     ------------------------------------------------------------------------ */
  function initForm() {
    var form = $('#contact-form');
    if (!form) { return; }

    var status = $('#form-status');
    var submit = $('button[type="submit"]', form);
    var submitLabel = $('.btn-label', submit);
    var endpoint = form.getAttribute('data-ajax-endpoint');
    var fallbackMail = 'raharijaonachristian981@gmail.com';
    var firstInteraction = 0;
    var sending = false;

    form.noValidate = true; // on prend le relais des bulles natives, peu accessibles

    var rules = {
      name: function (v) { return v.trim().length < 2 ? 'Indiquez votre nom (2 caractères minimum).' : ''; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Saisissez une adresse e-mail valide, par exemple nom@exemple.com.'; },
      message: function (v) { return v.trim().length < 10 ? 'Votre message doit contenir au moins 10 caractères.' : ''; }
    };

    function setStatus(text, state) {
      status.textContent = text;
      if (state) { status.setAttribute('data-state', state); } else { status.removeAttribute('data-state'); }
    }

    function fieldParts(name) {
      var input = form.elements[name];
      var wrapper = input.closest('.field');
      var error = $('.field-error', wrapper);
      return { input: input, wrapper: wrapper, error: error };
    }

    function validateField(name) {
      var parts = fieldParts(name);
      var message = rules[name](parts.input.value);
      if (message) {
        parts.wrapper.classList.add('has-error');
        parts.input.setAttribute('aria-invalid', 'true');
        parts.error.textContent = 'Erreur : ' + message;
        parts.error.hidden = false;
      } else {
        parts.wrapper.classList.remove('has-error');
        parts.input.removeAttribute('aria-invalid');
        parts.error.textContent = '';
        parts.error.hidden = true;
      }
      return message === '';
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      input.addEventListener('blur', function () { if (input.value !== '') { validateField(name); } });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') { validateField(name); }
      });
    });

    form.addEventListener('focusin', function () { if (!firstInteraction) { firstInteraction = Date.now(); } });

    function setSending(on) {
      sending = on;
      submit.disabled = on;
      submit.setAttribute('aria-busy', on ? 'true' : 'false');
      if (submitLabel) { submitLabel.textContent = on ? 'Envoi en cours…' : 'Envoyer le message'; }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (sending) { return; }

      // Validation
      var invalid = Object.keys(rules).filter(function (name) { return !validateField(name); });
      if (invalid.length) {
        setStatus(invalid.length === 1 ? 'Un champ est à corriger.' : invalid.length + ' champs sont à corriger.', 'error');
        form.elements[invalid[0]].focus();
        return;
      }

      // Protection : champ piège rempli (robot, ou remplissage automatique du navigateur)
      // → rien n'est envoyé, et on ne prétend surtout pas le contraire
      if (form.elements._honey && form.elements._honey.value) {
        setStatus('Le message n\'a pas pu être envoyé. Écrivez-moi directement à ' + fallbackMail + '.', 'error');
        return;
      }
      // Protection : envoi trop rapide après la première interaction
      if (!firstInteraction || Date.now() - firstInteraction < 3000) {
        setStatus('Patientez quelques secondes puis renvoyez le formulaire.', 'info');
        return;
      }
      if (!endpoint || !window.fetch) {
        // Pas d'envoi AJAX possible : repli sur l'envoi classique du formulaire
        form.noValidate = false;
        form.submit();
        return;
      }

      setSending(true);
      setStatus('Envoi en cours…', 'info');

      var payload = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
        _subject: form.elements._subject.value,
        _template: form.elements._template.value,
        _honey: ''
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().then(
          function (data) { return { ok: response.ok, data: data }; },
          function () { return { ok: response.ok, data: {} }; }
        );
      }).then(function (result) {
        var success = result.ok && (result.data.success === true || result.data.success === 'true');
        if (!success) { throw new Error('Réponse inattendue du service de formulaire'); }
        form.reset();
        firstInteraction = 0;
        setStatus('Merci, votre message a bien été transmis.', 'success');
        window.setTimeout(function () { setSending(false); }, 8000); // évite un second envoi immédiat
      }).catch(function (err) {
        if (window.console) { console.warn('[portfolio] envoi du formulaire :', err); }
        setStatus('Le message n\'a pas pu être envoyé. Écrivez-moi directement à ' + fallbackMail + '.', 'error');
        setSending(false);
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. Portrait de secours : si la photo manque, le monogramme du CSS apparaît
     ------------------------------------------------------------------------ */
  function initPortrait() {
    $$('.portrait img').forEach(function (img) {
      function fail() { img.hidden = true; }
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) { fail(); }
      else { img.addEventListener('error', fail, { once: true }); }
    });
  }

  /* ------------------------------------------------------------------------
     Initialisation
     ------------------------------------------------------------------------ */
  root.classList.add('js-ready'); // signale au CSS que ce script s'exécute (annule le filet de sécurité)
  safe('année', initYear);
  safe('menu', initMenu);
  safe('apparition', initReveal, function () { root.classList.add('reveal-off'); });
  safe('navigation active', initActiveNav);
  safe('études de cas', initCaseStudies);
  safe('retour en haut', initToTop);
  safe('copie e-mail', initCopy);
  safe('formulaire', initForm);
  safe('portrait', initPortrait);
})();
