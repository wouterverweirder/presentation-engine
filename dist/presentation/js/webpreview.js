{
  window.onerror = (msg, url, line, col, error) => {
    console.error(`${msg} (line: ${line})`);
  }
}
