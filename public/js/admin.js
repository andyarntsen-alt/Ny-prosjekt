document.addEventListener('DOMContentLoaded', () => {
  const imageInputs = document.querySelectorAll('[data-image-input]');

  imageInputs.forEach((input) => {
    const previewSelector = input.getAttribute('data-preview-target');
    let preview = null;

    if (previewSelector) {
      preview = document.querySelector(previewSelector);
    } else {
      const wrapper = input.closest('form') || document;
      preview = wrapper.querySelector('[data-image-preview]');
    }

    if (!preview) return;

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll('[data-repeater-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const templateId = button.getAttribute('data-template');
      const repeater = button.closest('[data-repeater]');
      const list = repeater ? repeater.querySelector('[data-repeater-list]') : null;
      const template = templateId ? document.getElementById(templateId) : null;

      if (!template || !list) return;
      list.appendChild(template.content.cloneNode(true));
    });
  });

  document.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-repeater-remove]');
    if (!removeButton) return;
    const item = removeButton.closest('[data-repeater-item]');
    if (item) {
      item.remove();
    }
  });

  const reorderList = document.querySelector('[data-reorder-list]');
  const reorderInput = document.querySelector('[data-reorder-input]');

  if (reorderList && reorderInput) {
    let draggingRow = null;

    const updateOrderInput = () => {
      const ids = Array.from(
        reorderList.querySelectorAll('[data-reorder-row]')
      ).map((row) => row.dataset.productId);
      reorderInput.value = ids.join(',');
    };

    const getDragAfterElement = (container, y) => {
      const rows = Array.from(
        container.querySelectorAll('[data-reorder-row]:not(.is-dragging)')
      );
      return rows.reduce(
        (closest, row) => {
          const box = row.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: row };
          }
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
    };

    reorderList.addEventListener('dragstart', (event) => {
      const handle = event.target.closest('[data-reorder-handle]');
      if (!handle) return;
      const row = handle.closest('[data-reorder-row]');
      if (!row) return;
      draggingRow = row;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    });

    reorderList.addEventListener('dragover', (event) => {
      if (!draggingRow) return;
      event.preventDefault();
      const afterElement = getDragAfterElement(reorderList, event.clientY);
      if (afterElement == null) {
        reorderList.appendChild(draggingRow);
      } else {
        reorderList.insertBefore(draggingRow, afterElement);
      }
    });

    reorderList.addEventListener('dragend', () => {
      if (draggingRow) {
        draggingRow.classList.remove('is-dragging');
        draggingRow = null;
        updateOrderInput();
      }
    });

    reorderList.addEventListener('drop', (event) => {
      if (!draggingRow) return;
      event.preventDefault();
      draggingRow.classList.remove('is-dragging');
      draggingRow = null;
      updateOrderInput();
    });

    updateOrderInput();
  }
});
