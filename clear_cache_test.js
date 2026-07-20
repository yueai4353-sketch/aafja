// 清除相关缓存的测试脚本
// 在浏览器控制台运行此脚本

console.log('开始清除缓存...');

// 清除藏叙相关的所有 localStorage
const keys = Object.keys(localStorage);
console.log('当前 localStorage 键:', keys);

keys.forEach(key => {
  if (key.startsWith('cangxu_')) {
    console.log('删除:', key);
    localStorage.removeItem(key);
  }
});

// 重新加载页面
console.log('缓存已清除，准备重新加载页面...');
setTimeout(() => {
  location.reload();
}, 1000);
