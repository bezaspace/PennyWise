import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  card: {
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  smallCard: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientCard: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[50],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    marginBottom: 6,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[200],
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[400],
  },
  button: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[50],
  },
  input: {
    backgroundColor: colors.neutral[700],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[600],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[700],
    marginVertical: 16,
  },
});