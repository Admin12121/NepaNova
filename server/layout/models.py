from django.db import models

class Layout(models.Model):
    slug = models.SlugField(unique=True)
    config = models.JSONField(default=dict)

    def __str__(self):
        return self.slug
