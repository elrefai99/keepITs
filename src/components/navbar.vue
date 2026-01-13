<script setup></script>

<template>
  <header>
    <nav w-full bg-transparent dark:bg-gray-800 dark:text-gray-200>
      <div max-w-xl mx-auto flex items-center justify-center px-6 py-4>
        <div text-md md:flex items-center gap-8 opacity-80>
          <router-link to="/" hover:text-gray-500 dark:hover:text-white-400 transition active-class="border-b-2 border-current pb-1">Home</router-link>
          <router-link to="/projects" hover:text-gray-400 dark:hover:text-white-400 ml4 md:-ml-4 transition active-class="border-b-2 border-current pb-1">Projects</router-link>
          <a hover:text-gray-500 dark:hover:text-white-400 ml4 md:-ml-4 transition href="/resume.pdf">Resume</a>
          <darkmode ml4 md:-ml-4 />
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
</style>
