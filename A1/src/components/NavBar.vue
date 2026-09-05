<template>
    <div class="container">
        <header class="d-flex justify-content-center py-3">
            <div class="col-6">
                Logo
            </div>
            <ul class="nav nav-pills">
                <li class="nav-item">
                    <router-link to="/" class="nav-link" active-class="active">Home</router-link>
                </li>
                <li class="nav-item">
                    <router-link to="/discover" class="nav-link" active-class="active">Discover & learn</router-link>
                </li>
                <li class="nav-item">
                    <router-link to="/get_involved" class="nav-link" active-class="active">Get involved</router-link>
                </li>
                <li class="nav-item">
                    <router-link to="/impact" class="nav-link" active-class="active">Impact</router-link>
                </li>
                <li class="nav-item">
                    <router-link to="/login" class="nav-link" active-class="active">Login</router-link>
                </li>
            </ul>
        </header>
    </div>
</template>

