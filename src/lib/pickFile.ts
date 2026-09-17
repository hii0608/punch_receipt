/** Opens the OS file picker. Must be called synchronously from a user gesture
 *  so Safari keeps the gesture token. */
export function pickFile(accept = 'image/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Chrome and Safari 16+ fire 'cancel'; elsewhere the focus fallback below
    // closes the promise out. The fallback waits long enough that a slow
    // picker's 'change' always wins — dropping a chosen photo is far worse
    // than leaving a hidden input around for a moment.
    input.addEventListener('cancel', () => finish(null));
    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (!input.files?.length) finish(null);
        }, 2500);
      },
      { once: true },
    );
    input.click();
  });
}
