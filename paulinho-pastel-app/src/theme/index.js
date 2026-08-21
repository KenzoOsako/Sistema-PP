export const colors = {
  primary: '#F97316', // Laranja vibrante
  primaryDark: '#EA580C',
  alert: '#EF4444', // Vermelho quente
  background: '#FAFAF9', // Off-white quente
  surface: '#FFFFFF', // Branco puro para cards
  border: '#EEEAE6', // Contorno sutil, mais quente que cinza puro
  text: '#1A1A1A', // Preto quase-puro
  textSecondary: '#78716C', // Cinza quente
  placeholder: '#B8B4AF', // Cinza apagado — precisa ficar visivelmente diferente de texto real digitado
  success: '#22C55E', // Verde para status 'Pronto'
  warning: '#EAB308', // Amarelo para status 'Recebido'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999, // Para botões bem arredondados e lúdicos
};

// Sombras consistentes em todo o app — evita ficar repetindo shadowColor/shadowOffset
// diferente em cada tela (visual "clean moderno" precisa disso alinhado).
export const shadows = {
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  button: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
};
