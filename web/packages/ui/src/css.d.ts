declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.css' {
  const content: string;
  export default content;
}
