import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    Components({
      // 自动引入 src/components 下的基础组件 + antd 组件与图标
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      dts: 'src/components.d.ts',
      resolvers: [
        AntDesignVueResolver({ importStyle: false, resolveIcons: true }),
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 0.0.0.0 = 监听全部 IPv4 网卡，本机 127.0.0.1 与内网 IP 都可访问。
    // 注意不要用 true（会同时绑 IPv6），本机系统代理会拦 IPv6 回环。
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    open: false,
  },
})
