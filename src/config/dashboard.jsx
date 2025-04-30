import React from 'react';
import { Box, H1, H2, H4, Text, Illustration } from '@adminjs/design-system';

const Dashboard = () => {
  return (
    <Box variant="grey">
      <Box variant="white" style={{ padding: '20px', marginBottom: '20px' }}>
        <H1>Панель администратора "Криминальный Блеф"</H1>
        <Text>Добро пожаловать в панель управления. Здесь вы можете управлять всеми аспектами игры.</Text>
      </Box>
      
      <Box variant="white" style={{ padding: '20px', marginBottom: '20px' }}>
        <H2>Краткое руководство</H2>
        
        <Box style={{ marginBottom: '10px' }}>
          <H4>Пользователи</H4>
          <Text>Просмотр и редактирование пользователей, их статистики и достижений</Text>
        </Box>
        
        <Box style={{ marginBottom: '10px' }}>
          <H4>Истории</H4>
          <Text>Управление игровым контентом, добавление новых историй и редактирование существующих</Text>
        </Box>
        
        <Box style={{ marginBottom: '10px' }}>
          <H4>Достижения</H4>
          <Text>Настройка системы достижений и критериев их получения</Text>
        </Box>
        
        <Box style={{ marginBottom: '10px' }}>
          <H4>Лидерборды</H4>
          <Text>Просмотр и управление рейтингами игроков</Text>
        </Box>
      </Box>
      
      <Box style={{ padding: '20px', marginBottom: '20px', background: '#1C2026', color: 'white' }}>
        <H2 style={{ color: 'white' }}>Полезные ссылки</H2>
        <Box style={{ marginBottom: '10px' }}>
          <Text style={{ color: '#ccc' }}>
            <a href="/api" style={{ color: '#E83333' }}>API Документация</a> - Просмотр доступных API-эндпоинтов
          </Text>
        </Box>
        <Box style={{ marginBottom: '10px' }}>
          <Text style={{ color: '#ccc' }}>
            <a href="/health" style={{ color: '#E83333' }}>Состояние системы</a> - Проверка состояния серверов
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 